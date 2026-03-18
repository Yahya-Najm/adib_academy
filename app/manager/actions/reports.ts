"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

// ── Write a manual report ──────────────────────────────────────────────────────

export async function createReport(data: {
  date: string;
  subjectType: "STAFF" | "TEACHER" | "STUDENT" | "CLASS";
  subjectId: string;
  reportKind: "SIMPLE" | "ACTIONABLE";
  reportType: string;
  content: string;
  actionDescription?: string;
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");
  if (!data.reportType.trim()) throw new Error("Report type is required");
  if (!data.content.trim()) throw new Error("Report content is required");
  if (data.reportKind === "ACTIONABLE" && !data.actionDescription?.trim())
    throw new Error("Action description is required for actionable reports");

  const date = new Date(data.date);
  await verifySubjectBelongsToBranch(data.subjectType, data.subjectId, branchId);

  return prisma.attendanceReport.create({
    data: {
      date,
      branchId,
      managerId,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      isAutomatic: false,
      reportKind: data.reportKind,
      reportType: data.reportType.trim(),
      content: data.content.trim(),
      actionDescription: data.reportKind === "ACTIONABLE" ? data.actionDescription?.trim() : null,
      isDone: data.reportKind === "ACTIONABLE" ? false : null,
    },
  });
}

export async function deleteReport(id: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const report = await prisma.attendanceReport.findUnique({ where: { id } });
  if (!report || report.branchId !== branchId) throw new Error("Report not found");
  if (report.isAutomatic) throw new Error("Auto-generated reports cannot be deleted");

  await prisma.attendanceReport.delete({ where: { id } });
}

export async function markReportDone(id: string, done: boolean) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const report = await prisma.attendanceReport.findUnique({ where: { id } });
  if (!report || report.branchId !== branchId) throw new Error("Report not found");
  if (report.reportKind !== "ACTIONABLE") throw new Error("Only actionable reports can be marked done");

  return prisma.attendanceReport.update({
    where: { id },
    data: {
      isDone: done,
      doneAt: done ? new Date() : null,
      doneById: done ? managerId : null,
    },
  });
}

// ── Read reports ───────────────────────────────────────────────────────────────

/** Reports for the dedicated /manager/reports page — filtered by date and optionally by type */
export async function getReportsByDate(dateStr: string, subjectType?: string, reportKind?: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const date = new Date(dateStr);

  const reports = await prisma.attendanceReport.findMany({
    where: {
      branchId,
      date,
      ...(subjectType ? { subjectType } : {}),
      ...(reportKind ? { reportKind: reportKind as "SIMPLE" | "ACTIONABLE" } : {}),
    },
    include: {
      manager: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const names = await buildNameMap(reports, branchId);
  return reports.map(r => ({ ...r, subjectName: names[r.subjectId] ?? r.subjectId }));
}

/** All pending (not-done) actionable reports for manager dashboard */
export async function getPendingActionableReports() {
  const { branchId } = await getManagerInfo();
  if (!branchId) return [];

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, reportKind: "ACTIONABLE", isDone: false },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const names = await buildNameMap(reports, branchId);
  return reports.map(r => ({ ...r, subjectName: names[r.subjectId] ?? r.subjectId }));
}

/** All reports for a specific subject (for profile pages) */
export async function getReportsForSubject(subjectType: "STAFF" | "TEACHER" | "STUDENT" | "CLASS", subjectId: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const reports = await prisma.attendanceReport.findMany({
    where: { branchId, subjectType, subjectId },
    include: {
      manager: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return reports;
}

/** Report counts for the manager dashboard */
export async function getReportCountsForDate(dateStr: string) {
  const { branchId } = await getManagerInfo();
  if (!branchId) return { total: 0, staff: 0, teachers: 0, students: 0, classes: 0, actionablePending: 0 };

  const date = new Date(dateStr);

  const [counts, actionablePending] = await Promise.all([
    prisma.attendanceReport.groupBy({
      by: ["subjectType"],
      where: { branchId, date },
      _count: { id: true },
    }),
    prisma.attendanceReport.count({
      where: { branchId, reportKind: "ACTIONABLE", isDone: false },
    }),
  ]);

  const map = Object.fromEntries(counts.map(c => [c.subjectType, c._count.id]));
  return {
    total: counts.reduce((s, c) => s + c._count.id, 0),
    staff: map["STAFF"] ?? 0,
    teachers: map["TEACHER"] ?? 0,
    students: map["STUDENT"] ?? 0,
    classes: map["CLASS"] ?? 0,
    actionablePending,
  };
}

/** Subjects available to report on — for the dedicated report page dropdowns */
export async function getReportableSubjects() {
  const { branchId } = await getManagerInfo();
  if (!branchId) throw new Error("No branch assigned");

  const [staffUsers, teachers, students, classes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF", active: true, branchId },
      select: { id: true, name: true, staffType: true, userId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", active: true, branchId },
      select: { id: true, name: true, userId: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: { active: true, branchId },
      select: { id: true, firstName: true, lastName: true, studentId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.courseClass.findMany({
      where: { branchId, status: "ACTIVE" },
      include: {
        courseTemplate: { select: { name: true } },
        sections: { include: { teacher: { select: { name: true } } }, orderBy: { sectionNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { staff: staffUsers, teachers, students, classes };
}

// ── Internal helpers ───────────────────────────────────────────────────────────

async function verifySubjectBelongsToBranch(
  subjectType: string,
  subjectId: string,
  branchId: string
) {
  if (subjectType === "STAFF" || subjectType === "TEACHER") {
    const user = await prisma.user.findUnique({ where: { id: subjectId } });
    if (!user || user.branchId !== branchId) throw new Error("Subject not found in your branch");
  } else if (subjectType === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { id: subjectId } });
    if (!student || student.branchId !== branchId) throw new Error("Student not found in your branch");
  } else if (subjectType === "CLASS") {
    const cls = await prisma.courseClass.findUnique({ where: { id: subjectId } });
    if (!cls || cls.branchId !== branchId) throw new Error("Class not found in your branch");
  }
}

export async function buildNameMap(
  reports: Array<{ subjectType: string; subjectId: string }>,
  _branchId: string
): Promise<Record<string, string>> {
  if (reports.length === 0) return {};

  const staffIds = reports.filter(r => r.subjectType === "STAFF").map(r => r.subjectId);
  const teacherIds = reports.filter(r => r.subjectType === "TEACHER").map(r => r.subjectId);
  const studentIds = reports.filter(r => r.subjectType === "STUDENT").map(r => r.subjectId);
  const classIds = reports.filter(r => r.subjectType === "CLASS").map(r => r.subjectId);

  const [staffList, teacherList, studentList, classList] = await Promise.all([
    staffIds.length ? prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, staffType: true, userId: true } }) : [],
    teacherIds.length ? prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, userId: true } }) : [],
    studentIds.length ? prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true, studentId: true } }) : [],
    classIds.length ? prisma.courseClass.findMany({
      where: { id: { in: classIds } },
      include: {
        courseTemplate: { select: { name: true } },
        sections: { include: { teacher: { select: { name: true } } }, orderBy: { sectionNumber: "asc" } },
      },
    }) : [],
  ]);

  const nameMap: Record<string, string> = {};
  staffList.forEach(u => { nameMap[u.id] = u.staffType ? `${u.name} (${u.staffType})` : u.name; });
  teacherList.forEach(u => { nameMap[u.id] = u.name; });
  studentList.forEach(s => { nameMap[s.id] = `${s.firstName} ${s.lastName}`; });
  classList.forEach(c => {
    const teachers = c.sections.map(s => s.teacher.name).join(", ");
    nameMap[c.id] = `${c.courseTemplate.name}${teachers ? ` — ${teachers}` : ""}`;
  });

  return nameMap;
}
