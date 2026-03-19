"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "./guard";

export async function getTeacherClasses() {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  const sections = await prisma.classSection.findMany({
    where: { teacherId },
    include: {
      courseClass: {
        include: {
          courseTemplate: { select: { name: true, durationMonths: true } },
          branch: { select: { name: true } },
          sections: {
            include: { teacher: { select: { id: true, name: true } } },
            orderBy: { sectionNumber: "asc" },
          },
          courseEnrollments: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { courseClass: { createdAt: "desc" } },
  });

  // Deduplicate classes (teacher may have multiple sections in same class)
  const seen = new Set<string>();
  const classes = sections
    .filter(s => { if (seen.has(s.courseClassId)) return false; seen.add(s.courseClassId); return true; })
    .map(s => ({
      ...s.courseClass,
      mySection: s,
      studentCount: s.courseClass.courseEnrollments.length,
    }));

  return classes;
}

export async function getTeacherClassDetail(courseClassId: string) {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  // Verify teacher has a section in this class
  const mySection = await prisma.classSection.findFirst({
    where: { courseClassId, teacherId },
  });
  if (!mySection) throw new Error("Not authorized to view this class");

  const cls = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: {
      courseTemplate: { select: { name: true, durationMonths: true, monthlyFee: true, numSections: true } },
      branch: { select: { name: true } },
      sections: {
        include: { teacher: { select: { id: true, name: true, userId: true } } },
        orderBy: { sectionNumber: "asc" },
      },
      courseEnrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, studentId: true, phone: true, email: true },
          },
        },
        orderBy: { enrolledAt: "asc" },
      },
      exams: {
        include: {
          examScores: { include: { student: { select: { id: true, firstName: true, lastName: true } } } },
          proctor: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      },
      monthFinalizations: {
        orderBy: { monthNumber: "asc" },
      },
    },
  });

  if (!cls) throw new Error("Class not found");

  return { cls, teacherId };
}

export async function upsertTeacherExamScore(examId: string, studentId: string, score: number) {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { courseClass: true },
  });
  if (!exam) throw new Error("Exam not found");

  // Verify teacher is in this class
  const mySection = await prisma.classSection.findFirst({
    where: { courseClassId: exam.courseClassId, teacherId },
  });
  if (!mySection) throw new Error("Not authorized to score this exam");

  if (exam.scoringFinalized) throw new Error("Exam scoring is finalized — scores cannot be changed");
  if (exam.courseClass.status === "COMPLETED") throw new Error("Class is completed — scores cannot be changed");

  return prisma.examScore.upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, score },
    update: { score },
  });
}

export async function finalizeTeacherExamScoring(examId: string) {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      courseClass: {
        include: { courseEnrollments: { where: { status: "ACTIVE" }, select: { studentId: true } } },
      },
      examScores: { select: { studentId: true } },
    },
  });
  if (!exam) throw new Error("Exam not found");

  const mySection = await prisma.classSection.findFirst({
    where: { courseClassId: exam.courseClassId, teacherId },
  });
  if (!mySection) throw new Error("Not authorized to finalize this exam");

  if (exam.scoringFinalized) throw new Error("Exam scoring is already finalized");

  const enrolledIds = new Set(exam.courseClass.courseEnrollments.map(e => e.studentId));
  const scoredIds = new Set(exam.examScores.map(s => s.studentId));
  const missing = [...enrolledIds].filter(id => !scoredIds.has(id));

  if (missing.length > 0) {
    const students = await prisma.student.findMany({
      where: { id: { in: missing } },
      select: { firstName: true, lastName: true },
    });
    throw new Error(`Missing scores for: ${students.map(s => `${s.firstName} ${s.lastName}`).join(", ")}`);
  }

  return prisma.exam.update({
    where: { id: examId },
    data: {
      scoringFinalized: true,
      scoringFinalizedAt: new Date(),
      scoringFinalizedById: teacherId,
    },
  });
}

export async function getTeacherExamNotifications() {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  const classIds = (await prisma.classSection.findMany({
    where: { teacherId },
    select: { courseClassId: true },
  })).map(s => s.courseClassId);

  if (classIds.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  const exams = await prisma.exam.findMany({
    where: {
      courseClassId: { in: classIds },
      courseClass: { status: "ACTIVE" },
      OR: [
        { date: { gte: today, lte: in3Days } },
        { date: { lt: today }, scoringFinalized: false },
      ],
    },
    include: {
      courseClass: { include: { courseTemplate: { select: { name: true } } } },
    },
    orderBy: { date: "asc" },
  });

  return exams;
}
