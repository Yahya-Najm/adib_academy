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

  const [exams, enrollments, holidays, monthFinalization] = await Promise.all([
    prisma.exam.findMany({
      where: {
        courseClassId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        proctor: { select: { id: true, name: true } },
        scoringFinalizedBy: { select: { name: true } },
        examScores: {
          include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.courseEnrollment.findMany({
      where: { courseClassId, status: "ACTIVE" },
      include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
      orderBy: { enrolledAt: "asc" },
    }),
    prisma.officialHoliday.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        OR: [{ branchId: null }, { branchId }],
      },
      orderBy: { date: "asc" },
    }),
    prisma.classMonthFinalization.findUnique({
      where: { courseClassId_monthNumber: { courseClassId, monthNumber } },
    }),
  ]);

  return { exams, enrollments, holidays, monthStart, monthEnd, monthFinalization };
}

export async function upsertExamScore(examId: string, studentId: string, score: number) {
  const { branchId } = await getManagerInfo();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { courseClass: true },
  });
  if (!exam || exam.courseClass.branchId !== branchId) throw new Error("Exam not found");
  if (exam.scoringFinalized) throw new Error("Exam scoring is finalized — scores cannot be changed");
  if (exam.courseClass.status === "COMPLETED") throw new Error("Class is completed — scores cannot be changed");

  return prisma.examScore.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, score },
    update: { score },
  });
}

/** Finalize a class month — locks teacher/student snapshot for that month */
export async function finalizeClassMonth(courseClassId: string, monthNumber: number) {
  const { id: managerId, branchId } = await getManagerInfo();

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: {
      courseTemplate: true,
      sections: { include: { teacher: { select: { id: true, name: true } } } },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
      },
    },
  });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");

  // Check if already finalized
  const existing = await prisma.classMonthFinalization.findUnique({
    where: { courseClassId_monthNumber: { courseClassId, monthNumber } },
  });
  if (existing) throw new Error(`Month ${monthNumber} is already finalized`);

  // Check all exams in this month have finalized scoring
  const monthStart = new Date(cls.startDate);
  monthStart.setMonth(monthStart.getMonth() + (monthNumber - 1));
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  const unfinalizedExams = await prisma.exam.findMany({
    where: { courseClassId, date: { gte: monthStart, lte: monthEnd }, scoringFinalized: false },
    select: { title: true },
  });
  if (unfinalizedExams.length > 0) {
    const names = unfinalizedExams.map(e => e.title).join(", ");
    throw new Error(`Finalize exam scoring first: ${names}`);
  }

  // Build snapshots
  const sectionsSnapshot = cls.sections.map(s => ({
    sectionNumber: s.sectionNumber,
    sectionName: s.sectionName,
    teacherId: s.teacherId,
    teacherName: s.teacher.name,
  }));
  const studentsSnapshot = cls.courseEnrollments.map(e => ({
    studentDbId: e.student.id,
    studentId: e.student.studentId,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
  }));

  return prisma.classMonthFinalization.create({
    data: {
      courseClassId,
      branchId,
      monthNumber,
      finalizedById: managerId,
      sectionsSnapshot,
      studentsSnapshot,
    },
  });
}

/** Mark a class as completed (requires final exam finalized + all months finalized) */
export async function markClassCompleted(courseClassId: string) {
  const { branchId } = await getManagerInfo();

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: {
      courseTemplate: { select: { durationMonths: true } },
      exams: { select: { examType: true, scoringFinalized: true, title: true } },
      monthFinalizations: { select: { monthNumber: true } },
    },
  });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");
  if (cls.status === "COMPLETED") throw new Error("Class is already completed");

  // Must have a final exam
  const finalExam = cls.exams.find(e => e.examType === "FINAL");
  if (!finalExam) throw new Error("A final exam is required before marking the class as complete");

  // Final exam scoring must be finalized
  if (!finalExam.scoringFinalized) throw new Error("Final exam scoring must be finalized before completing the class");

  // All months must be finalized
  const finalizedMonths = new Set(cls.monthFinalizations.map(f => f.monthNumber));
  const missingMonths = [];
  for (let m = 1; m <= cls.courseTemplate.durationMonths; m++) {
    if (!finalizedMonths.has(m)) missingMonths.push(m);
  }
  if (missingMonths.length > 0) {
    throw new Error(`Finalize all months first. Missing: Month ${missingMonths.join(", Month ")}`);
  }

  return prisma.courseClass.update({
    where: { id: courseClassId },
    data: { status: "COMPLETED" },
  });
}
