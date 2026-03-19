import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TeacherPaymentPDF from "@/components/pdf/TeacherPaymentPDF";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["MANAGER", "GENERAL_MANAGER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.teacherPayment.findFirst({
    where: {
      id,
      ...(session.user.role === "MANAGER" ? { branchId: session.user.branchId ?? undefined } : {}),
    },
    include: {
      teacher: {
        select: {
          id: true, name: true, userId: true,
          paymentType: true, perClassRate: true, revenuePercentage: true, hourlyRate: true,
        },
      },
      branch: { select: { name: true } },
      sections: true,
      paidClassMonths: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const periodStart = new Date(payment.year, payment.month - 1, 1);
  const periodEnd = new Date(payment.year, payment.month, 0);

  // Fetch reports and absences for the period
  const [reports, absences] = await Promise.all([
    prisma.attendanceReport.findMany({
      where: {
        subjectType: "TEACHER",
        subjectId: payment.teacherId,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: {
        manager: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.teacherAttendance.findMany({
      where: {
        teacherId: payment.teacherId,
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
    }),
  ]);

  // Mark PDF as generated if still DRAFT
  if (payment.status === "DRAFT") {
    await prisma.teacherPayment.update({
      where: { id: payment.id },
      data: { status: "PDF_GENERATED", pdfGeneratedAt: new Date() },
    });
  }

  const pdfDoc = TeacherPaymentPDF({
    payment: {
      id: payment.id,
      month: payment.month,
      year: payment.year,
      paymentType: payment.paymentType,
      grossAmount: payment.grossAmount,
      deduction: payment.deduction,
      deductionReason: payment.deductionReason,
      memo: payment.memo,
      netAmount: payment.netAmount,
      status: payment.status,
    },
    teacher: {
      name: payment.teacher.name,
      userId: payment.teacher.userId,
      perClassRate: payment.teacher.perClassRate,
      revenuePercentage: payment.teacher.revenuePercentage,
      hourlyRate: payment.teacher.hourlyRate,
    },
    branchName: payment.branch.name,
    sections: payment.sections.map(s => ({
      id: s.id,
      classNameSnapshot: s.classNameSnapshot,
      sectionLabel: s.sectionLabel,
      sessionsCount: s.sessionsCount,
      rateSnapshot: s.rateSnapshot,
      amount: s.amount,
    })),
    classMonths: payment.paidClassMonths.map(cm => ({
      id: cm.id,
      classNameSnapshot: cm.classNameSnapshot,
      monthNumber: cm.monthNumber,
      totalFeesAmount: cm.totalFeesAmount,
      percentageSnapshot: cm.percentageSnapshot,
      sectionsInClass: cm.sectionsInClass,
      teacherSections: cm.teacherSections,
      amount: cm.amount,
    })),
    absences,
    reports: reports.map(r => ({
      id: r.id,
      date: r.date,
      reportType: r.reportType,
      content: r.content,
      manager: r.manager,
      teacher: r.teacher,
    })),
    generatedAt: new Date(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfDoc as any);

  const safeName = payment.teacher.name.replace(/[^a-z0-9]/gi, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="teacher_payment_${safeName}_${payment.month}_${payment.year}.pdf"`,
    },
  });
}
