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

// ── Granular finalization helpers ─────────────────────────────────────────────

async function getScopeFinalization(date: Date, branchId: string, finalizationType: string, scopeId: string) {
  return prisma.attendanceFinalization.findUnique({
    where: {
      date_branchId_finalizationType_scopeId: { date, branchId, finalizationType, scopeId },
    },
  });
}

async function createScopeFinalization(date: Date, branchId: string, managerId: string, finalizationType: string, scopeId: string) {
  return prisma.attendanceFinalization.create({
    data: { date, branchId, managerId, finalizationType, scopeId },
  });
}

// ── Staff attendance ───────────────────────────────────────────────────────────

export async function getStaffAttendanceContext(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);
  const holidayLabel = await getDateHolidayLabel(date, branchId);

  const staff = await prisma.user.findMany({
    where: { role: "STAFF", active: true, branchId },
    select: { id: true, name: true, staffType: true, userId: true },
    orderBy: { name: "asc" },
  });

  const records = await prisma.staffAttendance.findMany({
    where: { branchId, date },
    select: { userId: true, present: true, isLate: true },
  });

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, date, subjectType: "STAFF" },
    include: { manager: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Per-staff finalization status
  const finalizations = await prisma.attendanceFinalization.findMany({
    where: { branchId, date, finalizationType: "STAFF" },
  });
  const finalizedStaffIds = new Set(finalizations.map(f => f.scopeId));

  return { staff, records, reports, holidayLabel, finalizedStaffIds: [...finalizedStaffIds], date: dateStr };
}

export async function finalizeStaffAttendance(staffId: string, dateStr: string) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);

  // Check all staff marked
  const record = await prisma.staffAttendance.findUnique({
    where: { userId_date: { userId: staffId, date } },
  });
  if (!record) throw new Error("Attendance not recorded for this staff member — mark present or absent first");

  const existing = await getScopeFinalization(date, branchId, "STAFF", staffId);
  if (existing) throw new Error("Already finalized");

  return createScopeFinalization(date, branchId, managerId, "STAFF", staffId);
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

  // Block if this staff member's attendance is finalized for this day
  const fin = await getScopeFinalization(date, branchId, "STAFF", data.userId);
  if (fin) throw new Error("This staff member's attendance for this day has been finalized");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user || user.branchId !== branchId || user.role !== "STAFF")
    throw new Error("Staff member not found in your branch");

  const record = await prisma.staffAttendance.upsert({
    where: { userId_date: { userId: data.userId, date } },
    create: { userId: data.userId, branchId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

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
    await prisma.attendanceReport.deleteMany({
      where: { date, branchId, subjectType: "STAFF", subjectId: data.userId, reportType: "ABSENT", isAutomatic: true },
    });
  }

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

  const classes = await prisma.courseClass.findMany({
    where: { branchId, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true, userId: true } } },
        orderBy: { sectionNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const activeClasses = classes.filter(c => !c.offDays.includes(dayName));

  const classHolidays = await prisma.classHoliday.findMany({
    where: { courseClassId: { in: activeClasses.map(c => c.id) }, date },
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
    include: { manager: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Per-teacher finalization status
  const finalizations = await prisma.attendanceFinalization.findMany({
    where: { branchId, date, finalizationType: "TEACHER" },
  });
  const finalizedTeacherIds = new Set(finalizations.map(f => f.scopeId));

  return { classes: activeClasses, classHolidayMap, records, reports, holidayLabel, finalizedTeacherIds: [...finalizedTeacherIds], date: dateStr };
}

export async function finalizeTeacherAttendance(teacherId: string, dateStr: string) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);

  // Check teacher has at least one section with attendance recorded on this day
  const sections = await prisma.classSection.findMany({
    where: { teacherId, courseClass: { branchId, status: "ACTIVE" } },
    select: { id: true },
  });

  if (sections.length === 0) throw new Error("Teacher has no active sections");

  const records = await prisma.teacherAttendance.findMany({
    where: { classSectionId: { in: sections.map(s => s.id) }, teacherId, date },
  });

  const sectionsWithAttendance = new Set(records.map(r => r.classSectionId));
  const missingSections = sections.filter(s => !sectionsWithAttendance.has(s.id));

  if (missingSections.length > 0) {
    throw new Error(`Attendance not recorded for all sections of this teacher — mark each section before finalizing`);
  }

  const existing = await getScopeFinalization(date, branchId, "TEACHER", teacherId);
  if (existing) throw new Error("Already finalized");

  return createScopeFinalization(date, branchId, managerId, "TEACHER", teacherId);
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

  // Block if this teacher's attendance is finalized for this day
  const fin = await getScopeFinalization(date, branchId, "TEACHER", data.teacherId);
  if (fin) throw new Error("This teacher's attendance for this day has been finalized");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  const section = await prisma.classSection.findUnique({
    where: { id: data.classSectionId },
    include: { courseClass: { select: { branchId: true, offDays: true, id: true } } },
  });
  if (!section || section.courseClass.branchId !== branchId)
    throw new Error("Section not found in your branch");

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (section.courseClass.offDays.includes(dayName))
    throw new Error("This class is off on this day");

  const classHoliday = await prisma.classHoliday.findUnique({
    where: { courseClassId_date: { courseClassId: section.courseClassId, date } },
  });
  if (classHoliday) throw new Error(`Class holiday: ${classHoliday.reason}`);

  const record = await prisma.teacherAttendance.upsert({
    where: { classSectionId_teacherId_date: { classSectionId: data.classSectionId, teacherId: data.teacherId, date } },
    create: { classSectionId: data.classSectionId, teacherId: data.teacherId, date, present: data.present, isLate: data.isLate },
    update: { present: data.present, isLate: data.isLate },
  });

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

  const classes = await prisma.courseClass.findMany({
    where: { branchId, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true } },
      sections: {
        include: {
          teacher: { select: { id: true, name: true } },
          studentEnrollments: {
            where: { status: "ACTIVE" },
            include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
            orderBy: { enrolledAt: "asc" },
          },
        },
        orderBy: { sectionNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const activeClasses = classes.filter(c => !c.offDays.includes(dayName));

  const classHolidays = await prisma.classHoliday.findMany({
    where: { courseClassId: { in: activeClasses.map(c => c.id) }, date },
  });
  const classHolidayMap = Object.fromEntries(classHolidays.map(ch => [ch.courseClassId, ch.reason]));

  const classIds = activeClasses.map(c => c.id);
  const sectionIds = activeClasses.flatMap(c => c.sections.map(s => s.id));
  const studentIds = activeClasses.flatMap(c => c.sections.flatMap(s => s.studentEnrollments.map(e => e.student.id)));

  const records = await prisma.studentAttendance.findMany({
    where: { courseClassId: { in: classIds }, date },
    select: { classSectionId: true, studentId: true, present: true, isLate: true },
  });

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, date, subjectType: { in: ["STUDENT", "CLASS"] }, subjectId: { in: [...studentIds, ...classIds] } },
    include: { manager: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Per-section finalization — scopeId is classSectionId for CLASS type
  const finalizations = await prisma.attendanceFinalization.findMany({
    where: { branchId, date, finalizationType: "CLASS", scopeId: { in: sectionIds } },
  });
  const finalizedSectionIds = new Set(finalizations.map(f => f.scopeId));
  const teacherFinalizedSectionIds = new Set(finalizations.filter(f => f.teacherId).map(f => f.scopeId));

  return {
    classes: activeClasses,
    classHolidayMap,
    records,
    reports,
    holidayLabel,
    finalizedSectionIds: [...finalizedSectionIds],
    teacherFinalizedSectionIds: [...teacherFinalizedSectionIds],
    date: dateStr,
  };
}

export async function finalizeClassAttendance(classSectionId: string, dateStr: string) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);

  const section = await prisma.classSection.findUnique({
    where: { id: classSectionId },
    include: {
      courseClass: true,
      studentEnrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
    },
  });
  if (!section || section.courseClass.branchId !== branchId) throw new Error("Section not found");

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

  const existing = await getScopeFinalization(date, branchId, "CLASS", classSectionId);
  if (existing) throw new Error("Already finalized");

  return createScopeFinalization(date, branchId, managerId, "CLASS", classSectionId);
}

export async function upsertStudentAttendance(data: {
  courseClassId: string;
  classSectionId: string;
  studentId: string;
  date: string;
  present: boolean;
  isLate: boolean;
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(data.date);

  const fin = await getScopeFinalization(date, branchId, "CLASS", data.classSectionId);
  if (fin) throw new Error("This section's attendance for this day has been finalized");

  const holidayLabel = await getDateHolidayLabel(date, branchId);
  if (holidayLabel) throw new Error(`Cannot record attendance on a holiday: ${holidayLabel}`);

  const cls = await prisma.courseClass.findUnique({ where: { id: data.courseClassId } });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found in your branch");

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
