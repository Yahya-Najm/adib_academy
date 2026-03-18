"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

// ── Holiday helpers ────────────────────────────────────────────────────────────

/** Returns the holiday label for a given date+branch, or null if not a holiday */
async function getDateHolidayLabel(date: Date, branchId: string): Promise<string | null> {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  // Weekly holiday: global or this branch
  const weekly = await prisma.weeklyHoliday.findFirst({
    where: {
      dayOfWeek: dayName,
      OR: [{ branchId: null }, { branchId }],
    },
  });
  if (weekly) return `Weekly Off — ${dayName}`;

  // Official holiday: global or this branch
  const official = await prisma.officialHoliday.findFirst({
    where: {
      date,
      OR: [{ branchId: null }, { branchId }],
    },
  });
  if (official) return `Holiday — ${official.name}`;

  return null;
}

// ── Finalization ───────────────────────────────────────────────────────────────

export async function getFinalization(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) return null;
  const date = new Date(dateStr);
  return prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
    include: { manager: { select: { name: true } } },
  });
}

export async function finalizeDay(dateStr: string) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");
  const date = new Date(dateStr);

  const existing = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
  });
  if (existing) throw new Error("This day is already finalized");

  return prisma.attendanceFinalization.create({
    data: { date, branchId, managerId },
  });
}

// ── Staff attendance ───────────────────────────────────────────────────────────

export async function getStaffAttendanceContext(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);
  const holidayLabel = await getDateHolidayLabel(date, branchId);
  const finalization = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
    include: { manager: { select: { name: true } } },
  });

  const staff = await prisma.user.findMany({
    where: { role: "STAFF", active: true, branchId },
    select: { id: true, name: true, staffType: true },
    orderBy: { name: "asc" },
  });

  const records = await prisma.staffAttendance.findMany({
    where: { branchId, date },
    select: { userId: true, present: true, isLate: true },
  });

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, date, subjectType: "STAFF" },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { staff, records, reports, holidayLabel, finalization, date: dateStr };
}

export async function upsertStaffAttendance(data: {
  userId: string;
  date: string;
  present: boolean;
  isLate: boolean;
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(data.date);

  // Block if finalized
  const fin = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
  });
  if (fin) throw new Error("This day has been finalized and cannot be changed");

  // Block if holiday
  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  // Verify staff belongs to branch
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user || user.branchId !== branchId || user.role !== "STAFF")
    throw new Error("Staff member not found in your branch");

  const record = await prisma.staffAttendance.upsert({
    where: { userId_date: { userId: data.userId, date } },
    create: { userId: data.userId, branchId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

  // Auto-create ABSENT report if marking absent (only once)
  if (!data.present) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STAFF", subjectId: data.userId, reportType: "ABSENT", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "STAFF", subjectId: data.userId, isAutomatic: true, reportType: "ABSENT", content: "Marked absent" },
      });
    }
  } else {
    // Remove auto ABSENT report if re-marking present
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STAFF", subjectId: data.userId, reportType: "ABSENT", isAutomatic: true },
    });
  }

  // Auto-create LATE report if late (only once)
  if (data.isLate) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STAFF", subjectId: data.userId, reportType: "LATE", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "STAFF", subjectId: data.userId, isAutomatic: true, reportType: "LATE", content: "Marked late" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STAFF", subjectId: data.userId, reportType: "LATE", isAutomatic: true },
    });
  }

  return record;
}

// ── Teacher attendance ─────────────────────────────────────────────────────────

export async function getTeacherAttendanceContext(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);
  const holidayLabel = await getDateHolidayLabel(date, branchId);
  const finalization = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
    include: { manager: { select: { name: true } } },
  });

  // All active classes in this branch with their sections + teachers
  const classes = await prisma.courseClass.findMany({
    where: { branchId, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { sectionNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter out classes that are off that day (class offDays)
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const activeClasses = classes.filter(c => !c.offDays.includes(dayName));

  // Check class-level holidays
  const classHolidays = await prisma.classHoliday.findMany({
    where: {
      courseClassId: { in: activeClasses.map(c => c.id) },
      date,
    },
  });
  const classHolidayMap = Object.fromEntries(classHolidays.map(ch => [ch.courseClassId, ch.reason]));

  const sectionIds = activeClasses.flatMap(c => c.sections.map(s => s.id));
  const records = await prisma.teacherAttendance.findMany({
    where: { classSectionId: { in: sectionIds }, date },
    select: { classSectionId: true, teacherId: true, present: true, isLate: true },
  });

  const teacherIds = [...new Set(activeClasses.flatMap(c => c.sections.map(s => s.teacher.id)))];
  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, date, subjectType: "TEACHER", subjectId: { in: teacherIds } },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { classes: activeClasses, classHolidayMap, records, reports, holidayLabel, finalization, date: dateStr };
}

export async function upsertTeacherAttendance(data: {
  classSectionId: string;
  teacherId: string;
  date: string;
  present: boolean;
  isLate: boolean;
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(data.date);

  const fin = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
  });
  if (fin) throw new Error("This day has been finalized and cannot be changed");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  // Verify section belongs to a class in this branch
  const section = await prisma.classSection.findUnique({
    where: { id: data.classSectionId },
    include: { courseClass: { select: { branchId: true, offDays: true } } },
  });
  if (!section || section.courseClass.branchId !== branchId)
    throw new Error("Section not found in your branch");

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (section.courseClass.offDays.includes(dayName))
    throw new Error("This class is off on this day");

  // Check class holiday
  const classHoliday = await prisma.classHoliday.findUnique({
    where: { courseClassId_date: { courseClassId: section.courseClassId, date } },
  });
  if (classHoliday) throw new Error(`Class holiday: ${classHoliday.reason}`);

  const record = await prisma.teacherAttendance.upsert({
    where: { classSectionId_teacherId_date: { classSectionId: data.classSectionId, teacherId: data.teacherId, date } },
    create: { classSectionId: data.classSectionId, teacherId: data.teacherId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

  // Auto ABSENT report
  if (!data.present) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "TEACHER", subjectId: data.teacherId, reportType: "ABSENT", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "TEACHER", subjectId: data.teacherId, isAutomatic: true, reportType: "ABSENT", content: "Marked absent" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "TEACHER", subjectId: data.teacherId, reportType: "ABSENT", isAutomatic: true },
    });
  }

  // Auto LATE report
  if (data.isLate) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "TEACHER", subjectId: data.teacherId, reportType: "LATE", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "TEACHER", subjectId: data.teacherId, isAutomatic: true, reportType: "LATE", content: "Marked late" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "TEACHER", subjectId: data.teacherId, reportType: "LATE", isAutomatic: true },
    });
  }

  return record;
}

// ── Student attendance ─────────────────────────────────────────────────────────

export async function getStudentAttendanceContext(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);
  const holidayLabel = await getDateHolidayLabel(date, branchId);
  const finalization = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
    include: { manager: { select: { name: true } } },
  });

  const classes = await prisma.courseClass.findMany({
    where: { branchId, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true } },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
        orderBy: { enrolledAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  // Filter out classes off that day by recurring offDays
  const activeClasses = classes.filter(c => !c.offDays.includes(dayName));

  // Class holidays for these classes on this date
  const classHolidays = await prisma.classHoliday.findMany({
    where: { courseClassId: { in: activeClasses.map(c => c.id) }, date },
  });
  const classHolidayMap = Object.fromEntries(classHolidays.map(ch => [ch.courseClassId, ch.reason]));

  const classIds = activeClasses.map(c => c.id);
  const studentIds = activeClasses.flatMap(c => c.courseEnrollments.map(e => e.student.id));

  const records = await prisma.studentAttendance.findMany({
    where: { courseClassId: { in: classIds }, date },
    select: { courseClassId: true, studentId: true, present: true, isLate: true },
  });

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, date, subjectType: { in: ["STUDENT", "CLASS"] }, subjectId: { in: [...studentIds, ...classIds] } },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return { classes: activeClasses, classHolidayMap, records, reports, holidayLabel, finalization, date: dateStr };
}

export async function upsertStudentAttendance(data: {
  courseClassId: string;
  studentId: string;
  date: string;
  present: boolean;
  isLate: boolean;
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(data.date);

  const fin = await prisma.attendanceFinalization.findUnique({
    where: { date_branchId: { date, branchId } },
  });
  if (fin) throw new Error("This day has been finalized and cannot be changed");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  // Verify class belongs to this branch
  const cls = await prisma.courseClass.findUnique({ where: { id: data.courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found in your branch");

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (cls.offDays.includes(dayName)) throw new Error("This class is off on this day");

  const classHoliday = await prisma.classHoliday.findUnique({
    where: { courseClassId_date: { courseClassId: data.courseClassId, date } },
  });
  if (classHoliday) throw new Error(`Class holiday: ${classHoliday.reason}`);

  // Verify student is enrolled in this class
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId: data.studentId, courseClassId: data.courseClassId } },
  });
  if (!enrollment || enrollment.status !== "ACTIVE")
    throw new Error("Student is not actively enrolled in this class");

  const record = await prisma.studentAttendance.upsert({
    where: { courseClassId_studentId_date: { courseClassId: data.courseClassId, studentId: data.studentId, date } },
    create: { courseClassId: data.courseClassId, studentId: data.studentId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

  // Auto ABSENT report
  if (!data.present) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "ABSENT", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "STUDENT", subjectId: data.studentId, isAutomatic: true, reportType: "ABSENT", content: "Marked absent" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "ABSENT", isAutomatic: true },
    });
  }

  // Auto LATE report
  if (data.isLate) {
    const exists = await prisma.attendanceReport.findFirst({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "LATE", isAutomatic: true },
    });
    if (!exists) {
      await prisma.attendanceReport.create({
        data: { date, branchId, managerId, subjectType: "STUDENT", subjectId: data.studentId, isAutomatic: true, reportType: "LATE", content: "Marked late" },
      });
    }
  } else {
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STUDENT", subjectId: data.studentId, reportType: "LATE", isAutomatic: true },
    });
  }

  return record;
}

// ── Class holidays (manager-set one-off) ──────────────────────────────────────

export async function addClassHoliday(data: {
  courseClassId: string;
  date: string;
  reason: string;
}) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");
  if (!data.reason.trim()) throw new Error("Reason is required");

  const cls = await prisma.courseClass.findUnique({ where: { id: data.courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found in your branch");

  const date = new Date(data.date);
  return prisma.classHoliday.upsert({
    where: { courseClassId_date: { courseClassId: data.courseClassId, date } },
    create: { courseClassId: data.courseClassId, date, reason: data.reason.trim() },
    update: { reason: data.reason.trim() },
  });
}

export async function deleteClassHoliday(id: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const ch = await prisma.classHoliday.findUnique({
    where: { id },
    include: { courseClass: { select: { branchId: true } } },
  });
  if (!ch || ch.courseClass.branchId !== branchId) throw new Error("Not found");
  await prisma.classHoliday.delete({ where: { id } });
}

export async function removeClassHolidayByClassDate(courseClassId: string, dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const cls = await prisma.courseClass.findUnique({ where: { id: courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  const date = new Date(dateStr);
  await prisma.classHoliday.deleteMany({ where: { courseClassId, date } });
}

export async function getClassHolidaysForClass(courseClassId: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const cls = await prisma.courseClass.findUnique({ where: { id: courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  return prisma.classHoliday.findMany({
    where: { courseClassId },
    orderBy: { date: "desc" },
  });
}
