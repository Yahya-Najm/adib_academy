"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

/** Compute which month of the class a given exam date falls in */
function computeClassMonth(classStartDate: Date, examDate: Date): number {
  const start = new Date(classStartDate);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setDate(1);
  exam.setHours(0, 0, 0, 0);
  const months = (exam.getFullYear() - start.getFullYear()) * 12 + (exam.getMonth() - start.getMonth());
  return Math.max(1, months + 1);
}

export async function getExams(courseClassId: string) {
  await requireManager();
  return prisma.exam.findMany({
    where: { courseClassId },
    include: {
      proctor: { select: { id: true, name: true } },
      scoringFinalizedBy: { select: { name: true } },
      examScores: { include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } } },
    },
    orderBy: { date: "asc" },
  });
}

export async function createExam(data: {
  courseClassId: string;
  title: string;
  date: string;
  description?: string;
  examType: "REGULAR" | "FINAL";
  proctorId?: string;
}) {
  const { branchId } = await getManagerInfo();
  if (!data.title.trim()) throw new Error("Exam title is required");
  if (!data.date) throw new Error("Exam date is required");

  // Validate class belongs to this branch
  const cls = await prisma.courseClass.findUnique({
    where: { id: data.courseClassId },
    select: { branchId: true, startDate: true, status: true },
  });
  if (!cls || cls.branchId !== branchId) throw new Error("Class not found");
  if (cls.status === "COMPLETED") throw new Error("Cannot add exams to a completed class");

  // Only one FINAL exam allowed per class
  if (data.examType === "FINAL") {
    const existing = await prisma.exam.findFirst({
      where: { courseClassId: data.courseClassId, examType: "FINAL" },
    });
    if (existing) throw new Error("A final exam already exists for this class");
  }

  const examDate = new Date(data.date);
  const classMonth = computeClassMonth(cls.startDate, examDate);

  return prisma.exam.create({
    data: {
      courseClassId: data.courseClassId,
      title: data.title.trim(),
      date: examDate,
      description: data.description?.trim() || null,
      examType: data.examType,
      classMonth,
      proctorId: data.proctorId || null,
    },
  });
}

export async function updateExam(
  id: string,
  data: { title: string; date: string; description?: string; proctorId?: string }
) {
  const { branchId } = await getManagerInfo();
  if (!data.title.trim()) throw new Error("Exam title is required");

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { courseClass: { select: { branchId: true, startDate: true, status: true } } },
  });
  if (!exam || exam.courseClass.branchId !== branchId) throw new Error("Exam not found");
  if (exam.scoringFinalized) throw new Error("Cannot edit a finalized exam");
  if (exam.courseClass.status === "COMPLETED") throw new Error("Cannot edit exams of a completed class");

  const examDate = new Date(data.date);
  const classMonth = computeClassMonth(exam.courseClass.startDate, examDate);

  return prisma.exam.update({
    where: { id },
    data: {
      title: data.title.trim(),
      date: examDate,
      description: data.description?.trim() || null,
      classMonth,
      proctorId: data.proctorId || null,
    },
  });
}

export async function deleteExam(id: string) {
  const { branchId } = await getManagerInfo();
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { courseClass: { select: { branchId: true, status: true } } },
  });
  if (!exam || exam.courseClass.branchId !== branchId) throw new Error("Exam not found");
  if (exam.scoringFinalized) throw new Error("Cannot delete a finalized exam");
  if (exam.courseClass.status === "COMPLETED") throw new Error("Cannot delete exams of a completed class");

  return prisma.exam.delete({ where: { id } });
}

export async function finalizeExamScoring(examId: string) {
  const { id: managerId, branchId } = await getManagerInfo();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      courseClass: {
        include: {
          courseEnrollments: { where: { status: "ACTIVE" }, select: { studentId: true } },
        },
      },
      examScores: { select: { studentId: true } },
    },
  });
  if (!exam || exam.courseClass.branchId !== branchId) throw new Error("Exam not found");
  if (exam.scoringFinalized) throw new Error("Exam scoring is already finalized");

  // Check all active enrolled students have scores
  const enrolledIds = new Set(exam.courseClass.courseEnrollments.map(e => e.studentId));
  const scoredIds = new Set(exam.examScores.map(s => s.studentId));
  const missing = [...enrolledIds].filter(id => !scoredIds.has(id));

  if (missing.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: missing } },
      select: { firstName: true, lastName: true },
    });
    const names = students.map(s => `${s.firstName} ${s.lastName}`).join(", ");
    throw new Error(`Missing scores for: ${names}`);
  }

  return prisma.exam.update({
    where: { id: examId },
    data: {
      scoringFinalized: true,
      scoringFinalizedAt: new Date(),
      scoringFinalizedById: managerId,
    },
  });
}

/** Exam notifications: exams within the next 3 days OR exams past due with unfinalized scoring */
export async function getExamNotifications() {
  const { branchId } = await getManagerInfo();
  if (!branchId) return [];

  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);

  return prisma.exam.findMany({
    where: {
      courseClass: { branchId, status: "ACTIVE" },
      scoringFinalized: false,
      OR: [
        // Upcoming: exam in next 3 days
        { date: { gte: now, lte: threeDaysLater } },
        // Past: exam already happened, scoring not finalized
        { date: { lt: now } },
      ],
    },
    include: {
      courseClass: { include: { courseTemplate: { select: { name: true } } } },
    },
    orderBy: { date: "asc" },
  });
}
