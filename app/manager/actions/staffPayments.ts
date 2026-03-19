"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

// Compute the next payment due date (monthly anniversary of joinDate on or after today)
function getPaymentDueDate(joinDate: Date, referenceDate: Date): Date {
  const day = joinDate.getDate();
  // Try this calendar month
  let candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
  // If the candidate is before reference (already passed), push to next month
  if (candidate < referenceDate) {
    candidate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, day);
  }
  return candidate;
}

// Compute the period start (one month before the dueDate, day of join)
function getPeriodStart(dueDate: Date): Date {
  return new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate());
}

export async function getStaffPaymentAlerts() {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(now.getDate() + 3);

  // Fetch all STAFF and MANAGER users for this branch
  const users = await prisma.user.findMany({
    where: {
      role: { in: ["STAFF", "MANAGER"] },
      branchId: branchId ?? undefined,
      active: true,
      monthlySalary: { not: null },
    },
    select: {
      id: true, name: true, userId: true, role: true, staffType: true,
      monthlySalary: true, createdAt: true,
      staffPayments: {
        where: { status: "FINALIZED" },
        select: { dueDate: true },
      },
    },
  });

  const alerts: {
    userId: string;
    name: string;
    userSlug: string | null;
    role: string;
    staffType: string | null;
    monthlySalary: number;
    dueDate: Date;
    daysUntil: number;
    isOverdue: boolean;
    existingPaymentStatus: string | null;
  }[] = [];

  for (const user of users) {
    const dueDate = getPaymentDueDate(user.createdAt, now);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Only alert if within 3 days from now (including overdue)
    if (daysUntil > 3) continue;

    // Check if already finalized for this due date
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    const alreadyPaid = user.staffPayments.some(
      p => p.dueDate.toISOString().slice(0, 10) === dueDateStr
    );
    if (alreadyPaid) continue;

    // Check if a draft/pdf payment exists
    const existing = await prisma.staffPayment.findUnique({
      where: { userId_dueDate: { userId: user.id, dueDate } },
      select: { status: true },
    });

    alerts.push({
      userId: user.id,
      name: user.name,
      userSlug: user.userId,
      role: user.role,
      staffType: user.staffType,
      monthlySalary: user.monthlySalary!,
      dueDate,
      daysUntil,
      isOverdue: daysUntil < 0,
      existingPaymentStatus: existing?.status ?? null,
    });
  }

  return alerts;
}

export async function getStaffPaymentList() {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["STAFF", "MANAGER"] },
      branchId: branchId ?? undefined,
      active: true,
    },
    select: {
      id: true, name: true, userId: true, role: true, staffType: true,
      monthlySalary: true, createdAt: true,
      staffPayments: {
        orderBy: { dueDate: "desc" },
        take: 6,
        select: {
          id: true, dueDate: true, periodStart: true, periodEnd: true,
          grossAmount: true, netAmount: true, deduction: true, status: true,
          finalizedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return users;
}

export async function getStaffPaymentContext(staffUserId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const user = await prisma.user.findFirst({
    where: { id: staffUserId, branchId: branchId ?? undefined, role: { in: ["STAFF", "MANAGER"] } },
    select: {
      id: true, name: true, userId: true, role: true, staffType: true,
      monthlySalary: true, createdAt: true,
      branch: { select: { name: true } },
    },
  });
  if (!user) throw new Error("Staff member not found");

  const now = new Date();
  const dueDate = getPaymentDueDate(user.createdAt, now);
  const periodStart = getPeriodStart(dueDate);
  const periodEnd = new Date(dueDate.getTime() - 86400000); // dueDate - 1 day

  // Existing payment for this cycle
  const existingPayment = await prisma.staffPayment.findUnique({
    where: { userId_dueDate: { userId: staffUserId, dueDate } },
  });

  // Attendance records for the period
  const attendances = await prisma.staffAttendance.findMany({
    where: {
      userId: staffUserId,
      date: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { date: "asc" },
  });

  const presentDays = attendances.filter(a => a.present).length;
  const absentDays = attendances.filter(a => !a.present).length;
  const lateDays = attendances.filter(a => a.isLate).length;

  // Reports about this staff member for the period
  const reports = await prisma.attendanceReport.findMany({
    where: {
      subjectType: "STAFF",
      subjectId: staffUserId,
      date: { gte: periodStart, lte: periodEnd },
    },
    include: {
      manager: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Past payments
  const pastPayments = await prisma.staffPayment.findMany({
    where: { userId: staffUserId },
    orderBy: { dueDate: "desc" },
    take: 12,
  });

  return {
    user,
    dueDate,
    periodStart,
    periodEnd,
    grossAmount: user.monthlySalary ?? 0,
    existingPayment,
    attendances,
    presentDays,
    absentDays,
    lateDays,
    reports,
    pastPayments,
  };
}

export async function createOrUpdateStaffPayment(
  staffUserId: string,
  deduction: number,
  deductionReason: string,
  memo: string,
) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const user = await prisma.user.findFirst({
    where: { id: staffUserId, branchId: branchId ?? undefined, role: { in: ["STAFF", "MANAGER"] } },
    select: { id: true, monthlySalary: true, createdAt: true, branchId: true },
  });
  if (!user) throw new Error("Staff member not found");
  if (!user.monthlySalary) throw new Error("No salary configured for this staff member");

  const now = new Date();
  const dueDate = getPaymentDueDate(user.createdAt, now);
  const periodStart = getPeriodStart(dueDate);
  const periodEnd = new Date(dueDate.getTime() - 86400000);

  const grossAmount = user.monthlySalary;
  const netAmount = Math.max(0, grossAmount - deduction);

  const existing = await prisma.staffPayment.findUnique({
    where: { userId_dueDate: { userId: staffUserId, dueDate } },
  });
  if (existing?.status === "FINALIZED") throw new Error("This payment is already finalized");

  return prisma.staffPayment.upsert({
    where: { userId_dueDate: { userId: staffUserId, dueDate } },
    create: {
      userId: staffUserId,
      branchId: user.branchId!,
      dueDate,
      periodStart,
      periodEnd,
      grossAmount,
      deduction,
      deductionReason: deductionReason || null,
      memo: memo || null,
      netAmount,
      status: "DRAFT",
    },
    update: {
      deduction,
      deductionReason: deductionReason || null,
      memo: memo || null,
      netAmount,
      status: "DRAFT",
      pdfGeneratedAt: null,
    },
  });
}

export async function markStaffPaymentPdfGenerated(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const payment = await prisma.staffPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "FINALIZED") throw new Error("Already finalized");

  return prisma.staffPayment.update({
    where: { id: paymentId },
    data: { status: "PDF_GENERATED", pdfGeneratedAt: new Date() },
  });
}

export async function finalizeStaffPayment(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const payment = await prisma.staffPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "DRAFT") throw new Error("PDF must be generated before finalizing");
  if (payment.status === "FINALIZED") throw new Error("Already finalized");

  return prisma.staffPayment.update({
    where: { id: paymentId },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedById: session.user.id,
    },
  });
}

export async function getStaffPaymentById(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  return prisma.staffPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
    include: {
      user: {
        select: {
          id: true, name: true, userId: true, role: true, staffType: true,
          monthlySalary: true, createdAt: true,
          branch: { select: { name: true } },
        },
      },
      finalizedBy: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });
}
