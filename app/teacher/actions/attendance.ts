"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "./guard";

async function getTeacherInfo() {
  const session = await requireTeacher();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

async function getDateHolidayLabel(date: Date, branchId: string): Promise<string | null> {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  const weekly = await prisma.weeklyHoliday.findFirst({
    where: { dayOfWeek: dayName, OR: [{ branchId: null }, { branchId }] },
  });
  if (weekly) return `Weekly Off — ${dayName}`;

  const official = await prisma.officialHoliday.findFirst({
    where: { date, OR: [{ branchId: null }, { branchId }] },
  });
  if (official) return `Holiday — ${official.name}`;

  return null;
}

/** Returns all active classes where this teacher has a section, grouped by class with their sections listed */
export async function getTeacherAttendanceClasses() {
  const { id: teacherId } = await getTeacherInfo();

  const mySections = await prisma.classSection.findMany({
    where: { teacherId },
    select: {
      id: true,
      sectionNumber: true,
      sectionName: true,
      courseClassId: true,
      courseClass: {
        select: {
          id: true,
          classId: true,
          status: true,
          offDays: true,
          courseTemplate: { select: { name: true } },
          branch: { select: { id: true, name: true } },
        },
      },
    },
  });

  const classMap = new Map<string, {
    cls: (typeof mySections)[number]["courseClass"];
    sections: { id: string; sectionNumber: number; sectionName: string | null }[];
  }>();

  for (const s of mySections) {
    if (s.courseClass.status !== "ACTIVE") continue;
    if (!classMap.has(s.courseClassId)) {
      classMap.set(s.courseClassId, { cls: s.courseClass, sections: [] });
    }
    classMap.get(s.courseClassId)!.sections.push({ id: s.id, sectionNumber: s.sectionNumber, sectionName: s.sectionName });
  }

  return [...classMap.values()];
}

export async function getTeacherStudentAttendanceContext(courseClassId: string, classSectionId: string, dateStr: string) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  // Verify teacher owns this specific section
  const mySection = await prisma.classSection.findUnique({
    where: { id: classSectionId },
  });
  if (!mySection || mySection.courseClassId !== courseClassId || mySection.teacherId !== teacherId)
    throw new Error("Not authorized to take attendance for this section");

  const date = new Date(dateStr);
  const holidayLabel = await getDateHolidayLabel(date, branchId);

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: { courseTemplate: { select: { name: true } } },
  });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const classOffDay = cls.offDays.includes(dayName) ? `Class off day — ${dayName}` : null;

  const classHoliday = await prisma.classHoliday.findUnique({
    where: { courseClassId_date: { courseClassId, date } },
  });

  // Students enrolled in this section only
  const sectionWithStudents = await prisma.classSection.findUnique({
    where: { id: classSectionId },
    include: {
      studentEnrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
        orderBy: { enrolledAt: "asc" },
      },
    },
  });

  const records = await prisma.studentAttendance.findMany({
    where: { classSectionId, date },
    select: { studentId: true, present: true, isLate: true },
  });

  const finalization = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId_finalizationType_scopeId: { date, branchId, finalizationType: "CLASS", scopeId: classSectionId } },
  });

  return {
    cls,
    section: { sectionNumber: mySection.sectionNumber, sectionName: mySection.sectionName, enrollments: sectionWithStudents?.studentEnrollments ?? [] },
    records,
    holidayLabel: holidayLabel ?? classOffDay ?? (classHoliday ? `Class Holiday — ${classHoliday.reason}` : null),
    finalized: !!finalization,
    finalizedByTeacher: !!finalization?.teacherId,
    date: dateStr,
  };
}

export async function teacherUpsertStudentAttendance(data: {
  courseClassId: string;
  classSectionId: string;
  studentId: string;
  date: string;
  present: boolean;
  isLate: boolean;
}) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(data.date);

  // Verify teacher owns this section
  const mySection = await prisma.classSection.findUnique({ where: { id: data.classSectionId } });
  if (!mySection || mySection.courseClassId !== data.courseClassId || mySection.teacherId !== teacherId)
    throw new Error("Not authorized to take attendance for this section");

  const fin = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId_finalizationType_scopeId: { date, branchId, finalizationType: "CLASS", scopeId: data.classSectionId } },
  });
  if (fin) throw new Error("This section's attendance for this day has been finalized");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  const cls = await prisma.courseClass.findUnique({ where: { id: data.courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (cls.offDays.includes(dayName)) throw new Error("This class is off on this day");

  const classHoliday = await prisma.classHoliday.findUnique({
    where: { courseClassId_date: { courseClassId: data.courseClassId, date } },
  });
  if (classHoliday) throw new Error(`Class holiday: ${classHoliday.reason}`);

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId: data.studentId, courseClassId: data.courseClassId } },
  });
  if (!enrollment || enrollment.status !== "ACTIVE" || enrollment.classSectionId !== data.classSectionId)
    throw new Error("Student is not actively enrolled in this section");

  const record = await prisma.studentAttendance.upsert({
    where: { classSectionId_studentId_date: { classSectionId: data.classSectionId, studentId: data.studentId, date } },
    create: { courseClassId: data.courseClassId, classSectionId: data.classSectionId, studentId: data.studentId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

  // Auto reports — use teacherId instead of managerId
  if (!data.present) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "ABSENT", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, teacherId, subjectType: "STUDENT", subjectId: data.studentId, isAutomatic: true, reportType: "ABSENT", content: "Marked absent" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "ABSENT", isAutomatic: true },
    });
  }

  if (data.isLate) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "LATE", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, teacherId, subjectType: "STUDENT", subjectId: data.studentId, isAutomatic: true, reportType: "LATE", content: "Marked late" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "LATE", isAutomatic: true },
    });
  }

  return record;
}

export async function teacherFinalizeClassAttendance(classSectionId: string, dateStr: string) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);

  const section = await prisma.classSection.findUnique({
    where: { id: classSectionId },
    include: {
      courseClass: true,
      studentEnrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
    },
  });
  if (!section || section.teacherId !== teacherId) throw new Error("Not authorized to finalize this section");
  if (section.courseClass.branchId !== branchId) throw new Error("Class not found");

  const enrolled = section.studentEnrollments.map(e => e.studentId);
  const records = await prisma.studentAttendance.findMany({
    where: { classSectionId, date },
    select: { studentId: true },
  });
  const recordedIds = new Set(records.map(r => r.studentId));
  const missing = enrolled.filter(id => !recordedIds.has(id));

  if (missing.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: missing } },
      select: { firstName: true, lastName: true },
    });
    throw new Error(`Attendance not recorded for: ${students.map(s => `${s.firstName} ${s.lastName}`).join(", ")}`);
  }

  const existing = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId_finalizationType_scopeId: { date, branchId, finalizationType: "CLASS", scopeId: classSectionId } },
  });
  if (existing) throw new Error("Already finalized");

  return prisma.attendanceFinalization.create({
    data: { date, branchId, teacherId, finalizationType: "CLASS", scopeId: classSectionId },
  });
}
