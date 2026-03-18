"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

export async function getClassDetail(courseClassId: string) {
  const { branchId } = await getManagerInfo();

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: {
      courseTemplate: true,
      branch: { select: { name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { sectionNumber: "asc" },
      },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      exams: { orderBy: { date: "asc" } },
    },
  });

  if (!cls) throw new Error("Class not found");
  if (cls.branchId !== branchId) throw new Error("Access denied");
  return cls;
}

export async function getClassMonthView(courseClassId: string, monthNumber: number) {
  const { branchId } = await getManagerInfo();

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: { courseTemplate: true },
  });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  const monthStart = new Date(cls.startDate);
  monthStart.setMonth(monthStart.getMonth() + (monthNumber - 1));
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  // Exams in this month's date range
  const exams = await prisma.exam.findMany({
    where: {
      courseClassId,
      date: { gte: monthStart, lte: monthEnd },
    },
    include: {
      examScores: {
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
      },
    },
    orderBy: { date: "asc" },
  });

  // Active enrollments (students)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseClassId, status: "ACTIVE" },
    include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
    orderBy: { enrolledAt: "asc" },
  });

  // Official holidays overlapping this month for this class's branch
  const holidays = await prisma.officialHoliday.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      OR: [{ branchId: null }, { branchId }],
    },
    orderBy: { date: "asc" },
  });

  return { exams, enrollments, holidays, monthStart, monthEnd };
}

export async function upsertExamScore(examId: string, studentId: string, score: number) {
  const { branchId } = await getManagerInfo();

  // Verify exam belongs to a class in this branch
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { courseClass: true },
  });
  if (!exam || exam.courseClass.branchId !== branchId) throw new Error("Exam not found");

  return prisma.examScore.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, score },
    update: { score },
  });
}
