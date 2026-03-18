"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

export async function getClassesGM(branchId?: string) {
  await requireGM();
  return prisma.courseClass.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      courseTemplate: { select: { name: true, durationMonths: true, monthlyFee: true } },
      branch: { select: { id: true, name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true, userId: true } } },
        orderBy: { sectionNumber: "asc" },
      },
      exams: { select: { id: true, examType: true, scoringFinalized: true } },
      monthFinalizations: { select: { monthNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClassDetailGM(courseClassId: string) {
  await requireGM();
  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: {
      courseTemplate: true,
      branch: { select: { name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true, userId: true } } },
        orderBy: { sectionNumber: "asc" },
      },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
        orderBy: { enrolledAt: "asc" },
      },
      exams: {
        include: {
          proctor: { select: { id: true, name: true } },
          scoringFinalizedBy: { select: { name: true } },
          examScores: {
            include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
          },
        },
        orderBy: { date: "asc" },
      },
      monthFinalizations: { orderBy: { monthNumber: "asc" } },
    },
  });
  if (!cls) throw new Error("Class not found");
  return cls;
}

export async function getBranchesGM() {
  await requireGM();
  return prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function getExamNotificationsGM() {
  await requireGM();
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);

  return prisma.exam.findMany({
    where: {
      courseClass: { status: "ACTIVE" },
      scoringFinalized: false,
      OR: [
        { date: { gte: now, lte: threeDaysLater } },
        { date: { lt: now } },
      ],
    },
    include: {
      courseClass: {
        include: {
          courseTemplate: { select: { name: true } },
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function reopenClass(courseClassId: string) {
  await requireGM();

  const cls = await prisma.courseClass.findUnique({ where: { id: courseClassId } });
  if (!cls) throw new Error("Class not found");
  if (cls.status !== "COMPLETED") throw new Error("Class is not completed");

  return prisma.courseClass.update({
    where: { id: courseClassId },
    data: { status: "ACTIVE" },
  });
}

export async function unlockClassMonth(courseClassId: string, monthNumber: number) {
  await requireGM();

  const existing = await prisma.classMonthFinalization.findUnique({
    where: { courseClassId_monthNumber: { courseClassId, monthNumber } },
  });
  if (!existing) throw new Error(`Month ${monthNumber} is not finalized`);

  return prisma.classMonthFinalization.delete({
    where: { courseClassId_monthNumber: { courseClassId, monthNumber } },
  });
}

export async function unlockExamScoring(examId: string) {
  await requireGM();

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error("Exam not found");
  if (!exam.scoringFinalized) throw new Error("Exam scoring is not finalized");

  return prisma.exam.update({
    where: { id: examId },
    data: { scoringFinalized: false, scoringFinalizedAt: null, scoringFinalizedById: null },
  });
}
