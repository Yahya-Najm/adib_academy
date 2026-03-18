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
    include: { manager: { select: { name: true } }, branch: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
}

/** GM dashboard: report counts across all branches for a given date */
export async function getReportCountsGM(dateStr: string) {
  await requireGM();
  const date = new Date(dateStr);

  const counts = await prisma.attendanceReport.groupBy({
    by: ["subjectType", "branchId"],
    where: { date },
    _count: { id: true },
  });

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

  return { ...totals, byBranch };
}
