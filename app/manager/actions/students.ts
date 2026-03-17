"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";
import { EducationLevel } from "@prisma/client";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

export async function getStudents(search?: string) {
  const { branchId } = await getManagerInfo();
  return prisma.student.findMany({
    where: {
      branchId: branchId ?? undefined,
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, age: true,
      phone: true, email: true, education: true, active: true,
      enrollments: {
        where: { status: "ACTIVE" },
        select: { courseClass: { select: { courseTemplate: { select: { name: true } } } } },
      },
    },
  });
}

export async function getStudent(id: string) {
  const { branchId } = await getManagerInfo();
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
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
  if (!student) throw new Error("Student not found");
  if (student.branchId !== branchId) throw new Error("Access denied");
  return student;
}

export async function createStudent(data: {
  firstName: string;
  lastName: string;
  age: number;
  phone?: string;
  email?: string;
  education: EducationLevel;
  address?: string;
  parentPhone1?: string;
  parentPhone2?: string;
}) {
  const { id: createdById, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("Your account has no branch assigned");
  if (!data.firstName.trim() || !data.lastName.trim()) throw new Error("First and last name are required");

  return prisma.student.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      age: data.age,
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      education: data.education,
      address: data.address?.trim() || null,
      parentPhone1: data.parentPhone1?.trim() || null,
      parentPhone2: data.parentPhone2?.trim() || null,
      branchId,
      createdById,
    },
  });
}

export async function updateStudent(id: string, data: {
  firstName: string;
  lastName: string;
  age: number;
  phone?: string;
  email?: string;
  education: EducationLevel;
  address?: string;
  parentPhone1?: string;
  parentPhone2?: string;
  active: boolean;
}) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing || existing.branchId !== branchId) throw new Error("Student not found");

  return prisma.student.update({
    where: { id },
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      age: data.age,
      phone: data.phone?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      education: data.education,
      address: data.address?.trim() || null,
      parentPhone1: data.parentPhone1?.trim() || null,
      parentPhone2: data.parentPhone2?.trim() || null,
      active: data.active,
    },
  });
}

export async function getClassesForEnrollment() {
  const { branchId } = await getManagerInfo();
  return prisma.courseClass.findMany({
    where: { branchId: branchId ?? undefined, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true, monthlyFee: true, durationMonths: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function enrollStudent(studentId: string, courseClassId: string) {
  const { branchId } = await getManagerInfo();

  // Verify student belongs to this branch
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.branchId !== branchId) throw new Error("Student not found");

  // Verify class belongs to this branch
  const courseClass = await prisma.courseClass.findUnique({
    where: { id: courseClassId },
    include: { courseTemplate: true },
  });
  if (!courseClass || courseClass.branchId !== branchId) throw new Error("Class not found");

  // Check not already enrolled
  const existing = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId, courseClassId } },
  });
  if (existing) throw new Error("Student is already enrolled in this class");

  const { monthlyFee, durationMonths } = courseClass.courseTemplate;
  const startDate = courseClass.startDate;

  // Create enrollment + monthly payments
  return prisma.courseEnrollment.create({
    data: {
      studentId,
      courseClassId,
      monthlyPayments: {
        create: Array.from({ length: durationMonths }, (_, i) => {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          return {
            monthNumber: i + 1,
            amount: monthlyFee,
            dueDate,
            status: "PENDING" as const,
          };
        }),
      },
    },
  });
}

export async function markPaymentPaid(paymentId: string) {
  const { branchId } = await getManagerInfo();
  const payment = await prisma.monthlyPayment.findUnique({
    where: { id: paymentId },
    include: { enrollment: { include: { student: true } } },
  });
  if (!payment || payment.enrollment.student.branchId !== branchId) throw new Error("Payment not found");

  return prisma.monthlyPayment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });
}
