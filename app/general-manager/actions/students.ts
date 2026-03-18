"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

export async function getAllStudents(search?: string) {
  await requireGM();
  return prisma.student.findMany({
    where: search ? {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, age: true,
      phone: true, email: true, education: true, active: true,
      branch: { select: { name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        select: { courseClass: { select: { courseTemplate: { select: { name: true } } } } },
      },
    },
  });
}

export async function getStudentExamScoresGM(studentId: string) {
  await requireGM();
  return prisma.examScore.findMany({
    where: { studentId },
    include: {
      exam: {
        include: {
          courseClass: {
            include: {
              courseTemplate: { select: { name: true } },
              branch: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { exam: { date: "desc" } },
  });
}

export async function getStudentGM(id: string) {
  await requireGM();
  return prisma.student.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      enrollments: {
        include: {
          courseClass: {
            include: {
              courseTemplate: { select: { name: true, monthlyFee: true, durationMonths: true } },
              branch: { select: { name: true } },
            },
          },
          monthlyPayments: { orderBy: { monthNumber: "asc" } },
        },
      },
    },
  });
}
