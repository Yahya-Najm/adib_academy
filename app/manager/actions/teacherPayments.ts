"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

export async function getTeacherPaymentList() {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      branchId: branchId ?? undefined,
      active: true,
    },
    select: {
      id: true, name: true, userId: true,
      paymentType: true, perClassRate: true, revenuePercentage: true, hourlyRate: true,
      teacherPayments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
        select: {
          id: true, month: true, year: true, paymentType: true,
          grossAmount: true, netAmount: true, deduction: true, status: true,
          finalizedAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return teachers;
}

export async function getTeacherPaymentContext(teacherId: string, month: number, year: number) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, branchId: branchId ?? undefined, role: "TEACHER" },
    select: {
      id: true, name: true, userId: true,
      paymentType: true, perClassRate: true, revenuePercentage: true, hourlyRate: true,
      branch: { select: { name: true } },
    },
  });
  if (!teacher) throw new Error("Teacher not found");

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0); // last day of month

  // Existing payment record for this month/year
  const existingPayment = await prisma.teacherPayment.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
    include: {
      sections: true,
      paidClassMonths: true,
    },
  });

  // Reports about this teacher in this period
  const reports = await prisma.attendanceReport.findMany({
    where: {
      subjectType: "TEACHER",
      subjectId: teacherId,
      date: { gte: periodStart, lte: periodEnd },
    },
    include: {
      manager: { select: { name: true } },
      teacher: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Past payments
  const pastPayments = await prisma.teacherPayment.findMany({
    where: { teacherId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
    select: {
      id: true, month: true, year: true, grossAmount: true, netAmount: true,
      deduction: true, status: true, finalizedAt: true, paymentType: true,
    },
  });

  // Sections assigned to this teacher for ACTIVE classes in this branch
  const sections = await prisma.classSection.findMany({
    where: {
      teacherId,
      courseClass: {
        branchId: branchId ?? undefined,
        status: "ACTIVE",
      },
    },
    include: {
      courseClass: {
        include: {
          courseTemplate: { select: { name: true } },
        },
      },
      teacherAttendances: {
        where: {
          teacherId,
          date: { gte: periodStart, lte: periodEnd },
          present: true,
        },
      },
    },
  });

  // For REVENUE_PERCENTAGE: find finalized class-months not yet paid for this teacher
  let eligibleClassMonths: {
    courseClassId: string;
    classNameSnapshot: string;
    monthNumber: number;
    totalFeesAmount: number;
    sectionsInClass: number;
    teacherSections: number;
    amount: number;
  }[] = [];

  if (teacher.paymentType === "REVENUE_PERCENTAGE" && teacher.revenuePercentage) {
    // Get all finalized class-months for classes where this teacher has sections
    const teacherClassIds = [...new Set(sections.map(s => s.courseClassId))];

    const finalizedMonths = await prisma.classMonthFinalization.findMany({
      where: {
        courseClassId: { in: teacherClassIds },
        branchId: branchId ?? undefined,
      },
      include: {
        courseClass: {
          include: { courseTemplate: { select: { name: true } } },
        },
      },
    });

    // Filter out already-paid class-months for this teacher
    const alreadyPaid = await prisma.teacherPaymentClassMonth.findMany({
      where: { teacherId },
      select: { courseClassId: true, monthNumber: true },
    });
    const paidSet = new Set(alreadyPaid.map(p => `${p.courseClassId}:${p.monthNumber}`));

    for (const fm of finalizedMonths) {
      const key = `${fm.courseClassId}:${fm.monthNumber}`;
      if (paidSet.has(key)) continue;

      // Calculate total student fees paid for this class-month
      const enrollments = await prisma.courseEnrollment.findMany({
        where: { courseClassId: fm.courseClassId, status: "ACTIVE" },
        include: {
          monthlyPayments: {
            where: { monthNumber: fm.monthNumber, status: { in: ["PAID", "PARTIAL"] } },
          },
        },
      });

      const totalFees = enrollments.reduce((sum, enr) =>
        sum + enr.monthlyPayments.reduce((s, p) => s + (p.paidAmount ?? p.amount), 0), 0
      );

      // Count total sections in this class and how many this teacher teaches
      const allSections = await prisma.classSection.count({
        where: { courseClassId: fm.courseClassId },
      });
      const teacherSectionsCount = sections.filter(s => s.courseClassId === fm.courseClassId).length;

      const amount = totalFees * (teacher.revenuePercentage / 100);

      eligibleClassMonths.push({
        courseClassId: fm.courseClassId,
        classNameSnapshot: fm.courseClass.courseTemplate.name,
        monthNumber: fm.monthNumber,
        totalFeesAmount: totalFees,
        sectionsInClass: allSections,
        teacherSections: teacherSectionsCount,
        amount,
      });
    }
  }

  // Build section summaries for PER_CLASS / FIXED_HOURS
  const sectionSummaries = sections.map(s => ({
    classSectionId: s.id,
    courseClassId: s.courseClassId,
    classNameSnapshot: s.courseClass.courseTemplate.name,
    sectionLabel: s.sectionName ? `Section ${s.sectionNumber} — ${s.sectionName}` : `Section ${s.sectionNumber}`,
    sessionsCount: s.teacherAttendances.length,
    rateSnapshot: teacher.paymentType === "PER_CLASS"
      ? (teacher.perClassRate ?? 0)
      : (teacher.hourlyRate ?? 0),
    amount: s.teacherAttendances.length * (
      teacher.paymentType === "PER_CLASS"
        ? (teacher.perClassRate ?? 0)
        : (teacher.hourlyRate ?? 0)
    ),
  }));

  // Calculate gross
  let grossAmount = 0;
  if (teacher.paymentType === "REVENUE_PERCENTAGE") {
    grossAmount = eligibleClassMonths.reduce((sum, cm) => sum + cm.amount, 0);
  } else {
    grossAmount = sectionSummaries.reduce((sum, s) => sum + s.amount, 0);
  }

  // Teacher absences this period (teacher marked absent in any section)
  const absenceRecords = await prisma.teacherAttendance.findMany({
    where: {
      teacherId,
      date: { gte: periodStart, lte: periodEnd },
      present: false,
    },
    include: {
      classSection: {
        include: {
          courseClass: { include: { courseTemplate: { select: { name: true } } } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  return {
    teacher,
    month,
    year,
    periodStart,
    periodEnd,
    grossAmount,
    sectionSummaries,
    eligibleClassMonths,
    existingPayment,
    reports,
    absenceRecords,
    pastPayments,
  };
}

export async function createOrUpdateTeacherPayment(
  teacherId: string,
  month: number,
  year: number,
  deduction: number,
  deductionReason: string,
  memo: string,
  sectionSummaries: {
    classSectionId: string;
    courseClassId: string;
    classNameSnapshot: string;
    sectionLabel: string;
    sessionsCount: number;
    rateSnapshot: number;
    amount: number;
  }[],
  eligibleClassMonths: {
    courseClassId: string;
    classNameSnapshot: string;
    monthNumber: number;
    totalFeesAmount: number;
    percentageSnapshot: number;
    sectionsInClass: number;
    teacherSections: number;
    amount: number;
  }[],
) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, branchId: branchId ?? undefined, role: "TEACHER" },
    select: { id: true, paymentType: true, branchId: true },
  });
  if (!teacher) throw new Error("Teacher not found");

  const existing = await prisma.teacherPayment.findUnique({
    where: { teacherId_month_year: { teacherId, month, year } },
  });
  if (existing?.status === "FINALIZED") throw new Error("This payment is already finalized");

  const grossAmount = teacher.paymentType === "REVENUE_PERCENTAGE"
    ? eligibleClassMonths.reduce((sum, cm) => sum + cm.amount, 0)
    : sectionSummaries.reduce((sum, s) => sum + s.amount, 0);
  const netAmount = Math.max(0, grossAmount - deduction);

  return prisma.$transaction(async (tx) => {
    // Upsert the payment record
    const payment = await tx.teacherPayment.upsert({
      where: { teacherId_month_year: { teacherId, month, year } },
      create: {
        teacherId,
        branchId: teacher.branchId!,
        month,
        year,
        paymentType: teacher.paymentType!,
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
        grossAmount,
        netAmount,
        status: "DRAFT",
        pdfGeneratedAt: null,
      },
    });

    // Delete and recreate line items
    await tx.teacherPaymentSection.deleteMany({ where: { teacherPaymentId: payment.id } });
    await tx.teacherPaymentClassMonth.deleteMany({ where: { teacherPaymentId: payment.id } });

    if (teacher.paymentType !== "REVENUE_PERCENTAGE" && sectionSummaries.length > 0) {
      await tx.teacherPaymentSection.createMany({
        data: sectionSummaries.map(s => ({
          teacherPaymentId: payment.id,
          classSectionId: s.classSectionId,
          courseClassId: s.courseClassId,
          classNameSnapshot: s.classNameSnapshot,
          sectionLabel: s.sectionLabel,
          sessionsCount: s.sessionsCount,
          rateSnapshot: s.rateSnapshot,
          amount: s.amount,
        })),
      });
    }

    if (teacher.paymentType === "REVENUE_PERCENTAGE" && eligibleClassMonths.length > 0) {
      await tx.teacherPaymentClassMonth.createMany({
        data: eligibleClassMonths.map(cm => ({
          teacherPaymentId: payment.id,
          teacherId,
          courseClassId: cm.courseClassId,
          classNameSnapshot: cm.classNameSnapshot,
          monthNumber: cm.monthNumber,
          totalFeesAmount: cm.totalFeesAmount,
          percentageSnapshot: cm.percentageSnapshot,
          sectionsInClass: cm.sectionsInClass,
          teacherSections: cm.teacherSections,
          amount: cm.amount,
        })),
      });
    }

    return payment;
  });
}

export async function markTeacherPaymentPdfGenerated(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const payment = await prisma.teacherPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "FINALIZED") throw new Error("Already finalized");

  return prisma.teacherPayment.update({
    where: { id: paymentId },
    data: { status: "PDF_GENERATED", pdfGeneratedAt: new Date() },
  });
}

export async function finalizeTeacherPayment(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const payment = await prisma.teacherPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "DRAFT") throw new Error("PDF must be generated before finalizing");
  if (payment.status === "FINALIZED") throw new Error("Already finalized");

  return prisma.teacherPayment.update({
    where: { id: paymentId },
    data: {
      status: "FINALIZED",
      finalizedAt: new Date(),
      finalizedById: session.user.id,
    },
  });
}

export async function getTeacherPaymentById(paymentId: string) {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  return prisma.teacherPayment.findFirst({
    where: { id: paymentId, branchId: branchId ?? undefined },
    include: {
      teacher: {
        select: {
          id: true, name: true, userId: true,
          paymentType: true, perClassRate: true, revenuePercentage: true, hourlyRate: true,
          branch: { select: { name: true } },
        },
      },
      sections: true,
      paidClassMonths: true,
      finalizedBy: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });
}
