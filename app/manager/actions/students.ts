"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";
import { EducationLevel } from "@prisma/client";
import { randomBytes } from "crypto";

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
          { studentId: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, age: true,
      phone: true, email: true, education: true, active: true,
      studentId: true,
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

async function generateStudentId(firstName: string, lastName: string): Promise<string> {
  const base = `${firstName.toLowerCase().trim()}-${lastName.toLowerCase().trim()}`;
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.student.findUnique({ where: { studentId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate unique student ID");
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

  const studentId = await generateStudentId(data.firstName, data.lastName);

  return prisma.student.create({
    data: {
      studentId,
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

export async function updateStudentId(id: string, newStudentId: string) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing || existing.branchId !== branchId) throw new Error("Student not found");

  const trimmed = newStudentId.trim();
  if (!trimmed) throw new Error("Student ID cannot be empty");

  const conflict = await prisma.student.findUnique({ where: { studentId: trimmed } });
  if (conflict && conflict.id !== id) throw new Error("This student ID is already taken");

  return prisma.student.update({ where: { id }, data: { studentId: trimmed } });
}

export async function getClassesForEnrollment() {
  const { branchId } = await getManagerInfo();
  return prisma.courseClass.findMany({
    where: { branchId: branchId ?? undefined, status: "ACTIVE" },
    include: {
      courseTemplate: { select: { name: true, monthlyFee: true, durationMonths: true } },
      sections: {
        include: { teacher: { select: { name: true } } },
        orderBy: { sectionNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function enrollStudent(studentId: string, courseClassId: string, classSectionId: string, fromDate?: string) {
  const { branchId } = await getManagerInfo();

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.branchId !== branchId) throw new Error("Student not found");

  const section = await prisma.classSection.findUnique({
    where: { id: classSectionId },
    include: { courseClass: { include: { courseTemplate: true } } },
  });
  if (!section || section.courseClassId !== courseClassId || section.courseClass.branchId !== branchId)
    throw new Error("Section not found");

  const existing = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseClassId: { studentId, courseClassId } },
  });
  if (existing) throw new Error("Student is already enrolled in this class");

  const { monthlyFee, durationMonths } = section.courseClass.courseTemplate;
  const startDate = section.courseClass.startDate;

  return prisma.courseEnrollment.create({
    data: {
      studentId,
      courseClassId,
      classSectionId,
      monthlyPayments: {
        create: Array.from({ length: durationMonths }, (_, i) => {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          return {
            monthNumber: i + 1,
            amount: monthlyFee,
            dueDate,
            status: "PENDING" as const,
            ...(i === 0 && fromDate ? { fromDate: new Date(fromDate) } : {}),
          };
        }),
      },
    },
  });
}

export async function recordPayment(
  paymentId: string,
  opts: {
    amount: number;       // installment being paid now
    feesRefId: string;    // required
    discounted?: boolean;
    paidAt?: string;      // ISO date string; undefined = now
  }
) {
  const { id: recordedById, branchId } = await getManagerInfo();
  const payment = await prisma.monthlyPayment.findUnique({
    where: { id: paymentId },
    include: { enrollment: { include: { student: true } } },
  });
  if (!payment || payment.enrollment.student.branchId !== branchId)
    throw new Error("Payment not found");

  if (!opts.feesRefId?.trim()) throw new Error("Fees reference ID is required");
  if (!opts.discounted && opts.amount <= 0) throw new Error("Amount must be greater than 0");

  const existing = payment.paidAmount ?? 0;
  const newTotal = existing + opts.amount;

  if (newTotal > payment.amount)
    throw new Error(
      `Amount exceeds monthly fee. Remaining: $${(payment.amount - existing).toFixed(2)}`
    );

  const paidAt = opts.paidAt ? new Date(opts.paidAt) : new Date();
  const status = opts.discounted || newTotal >= payment.amount ? "PAID" : "PARTIAL";
  const student = payment.enrollment.student;
  const studentName = `${student.firstName} ${student.lastName}`;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.monthlyPayment.update({
      where: { id: paymentId },
      data: {
        paidAmount: newTotal,
        feesRefId: opts.feesRefId.trim(),
        discounted: opts.discounted ?? false,
        paidAt,
        status,
      },
    });

    // Record real money received (skip $0 discount-only entries)
    if (opts.amount > 0) {
      await tx.transaction.create({
        data: {
          type: "INCOME",
          sourceType: "STUDENT_PAYMENT",
          sourceId: paymentId,
          category: "Tuition Fee",
          description: `${studentName} — Month ${payment.monthNumber} (Ref: ${opts.feesRefId.trim()})`,
          amount: opts.amount,
          transactionDate: paidAt,
          branchId: branchId!,
          recordedById,
        },
      });
    }

    return updated;
  });
}

export async function getStudentExamScores(studentId: string) {
  const { branchId } = await getManagerInfo();
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { branchId: true } });
  if (!student || student.branchId !== branchId) throw new Error("Student not found");

  return prisma.examScore.findMany({
    where: { studentId },
    include: {
      exam: {
        include: {
          courseClass: { include: { courseTemplate: { select: { name: true } } } },
        },
      },
    },
    orderBy: { exam: { date: "desc" } },
  });
}
