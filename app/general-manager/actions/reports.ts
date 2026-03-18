"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

/** GM can view reports for any subject across all branches */
export async function getReportsForSubjectGM(
  subjectType: "STAFF" | "TEACHER" | "STUDENT" | "CLASS",
  subjectId: string
) {
  await requireGM();
  return prisma.attendanceReport.findMany({
    where: { subjectType, subjectId },
    include: {
      manager: { select: { name: true } },
      branch: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}

/** GM dashboard: report counts across all branches for a given date */
export async function getReportCountsGM(dateStr: string) {
  await requireGM();
  const date = new Date(dateStr);

  const [counts, actionablePending] = await Promise.all([
    prisma.attendanceReport.groupBy({
      by: ["subjectType", "branchId"],
      where: { date },
      _count: { id: true },
    }),
    prisma.attendanceReport.count({
      where: { reportKind: "ACTIONABLE", isDone: false },
    }),
  ]);

  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

  const totals = { total: 0, staff: 0, teachers: 0, students: 0, classes: 0 };
  counts.forEach(c => {
    totals.total += c._count.id;
    if (c.subjectType === "STAFF") totals.staff += c._count.id;
    if (c.subjectType === "TEACHER") totals.teachers += c._count.id;
    if (c.subjectType === "STUDENT") totals.students += c._count.id;
    if (c.subjectType === "CLASS") totals.classes += c._count.id;
  });

  // Per-branch breakdown
  const byBranch = branches.map(b => {
    const branchCounts = counts.filter(c => c.branchId === b.id);
    return {
      branchName: b.name,
      total: branchCounts.reduce((s, c) => s + c._count.id, 0),
    };
  });

  return { ...totals, actionablePending, byBranch };
}

/** GM: all actionable reports across all branches, with resolution status */
export async function getAllActionableReportsGM(branchId?: string, onlyPending?: boolean) {
  await requireGM();

  const reports = await prisma.attendanceReport.findMany({
    where: {
      reportKind: "ACTIONABLE",
      ...(branchId ? { branchId } : {}),
      ...(onlyPending ? { isDone: false } : {}),
    },
    include: {
      manager: { select: { name: true } },
      branch: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
  });

  // Build name map for subjects
  const nameMap: Record<string, string> = {};
  const staffIds = [...new Set(reports.filter(r => r.subjectType === "STAFF").map(r => r.subjectId))];
  const teacherIds = [...new Set(reports.filter(r => r.subjectType === "TEACHER").map(r => r.subjectId))];
  const studentIds = [...new Set(reports.filter(r => r.subjectType === "STUDENT").map(r => r.subjectId))];
  const classIds = [...new Set(reports.filter(r => r.subjectType === "CLASS").map(r => r.subjectId))];

  const [staffList, teacherList, studentList, classList] = await Promise.all([
    staffIds.length ? prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, staffType: true } }) : [],
    teacherIds.length ? prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }) : [],
    studentIds.length ? prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
    classIds.length ? prisma.courseClass.findMany({ where: { id: { in: classIds } }, include: { courseTemplate: { select: { name: true } } } }) : [],
  ]);

  staffList.forEach(u => { nameMap[u.id] = u.staffType ? `${u.name} (${u.staffType})` : u.name; });
  teacherList.forEach(u => { nameMap[u.id] = u.name; });
  studentList.forEach(s => { nameMap[s.id] = `${s.firstName} ${s.lastName}`; });
  classList.forEach(c => { nameMap[c.id] = c.courseTemplate.name; });

  return reports.map(r => ({ ...r, subjectName: nameMap[r.subjectId] ?? r.subjectId }));
}

/** GM can mark an actionable report as done / reopen it */
export async function markReportDoneGM(id: string, done: boolean) {
  const session = await requireGM();
  return prisma.attendanceReport.update({
    where: { id },
    data: {
      isDone: done,
      doneAt: done ? new Date() : null,
      doneById: done ? session.user.id : null,
    },
  });
}

/** GM: browse all reports across branches, optionally filtered */
export async function getAllReportsGM(opts: {
  dateStr?: string;
  branchId?: string;
  subjectType?: string;
  reportKind?: string;
}) {
  await requireGM();

  const reports = await prisma.attendanceReport.findMany({
    where: {
      ...(opts.dateStr ? { date: new Date(opts.dateStr) } : {}),
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(opts.subjectType ? { subjectType: opts.subjectType } : {}),
      ...(opts.reportKind ? { reportKind: opts.reportKind as "SIMPLE" | "ACTIONABLE" } : {}),
    },
    include: {
      manager: { select: { name: true } },
      branch: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const nameMap: Record<string, string> = {};
  const staffIds = [...new Set(reports.filter(r => r.subjectType === "STAFF").map(r => r.subjectId))];
  const teacherIds = [...new Set(reports.filter(r => r.subjectType === "TEACHER").map(r => r.subjectId))];
  const studentIds = [...new Set(reports.filter(r => r.subjectType === "STUDENT").map(r => r.subjectId))];
  const classIds = [...new Set(reports.filter(r => r.subjectType === "CLASS").map(r => r.subjectId))];

  const [staffList, teacherList, studentList, classList] = await Promise.all([
    staffIds.length ? prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true, staffType: true } }) : [],
    teacherIds.length ? prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }) : [],
    studentIds.length ? prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true } }) : [],
    classIds.length ? prisma.courseClass.findMany({ where: { id: { in: classIds } }, include: { courseTemplate: { select: { name: true } } } }) : [],
  ]);

  staffList.forEach(u => { nameMap[u.id] = u.staffType ? `${u.name} (${u.staffType})` : u.name; });
  teacherList.forEach(u => { nameMap[u.id] = u.name; });
  studentList.forEach(s => { nameMap[s.id] = `${s.firstName} ${s.lastName}`; });
  classList.forEach(c => { nameMap[c.id] = c.courseTemplate.name; });

  return reports.map(r => ({ ...r, subjectName: nameMap[r.subjectId] ?? r.subjectId }));
}
