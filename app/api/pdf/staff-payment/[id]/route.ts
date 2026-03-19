import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StaffPaymentPDF from "@/components/pdf/StaffPaymentPDF";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["MANAGER", "GENERAL_MANAGER"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const payment = await prisma.staffPayment.findFirst({
    where: {
      id,
      ...(session.user.role === "MANAGER" ? { branchId: session.user.branchId ?? undefined } : {}),
    },
    include: {
      user: {
        select: {
          id: true, name: true, userId: true, role: true, staffType: true,
          monthlySalary: true, createdAt: true,
        },
      },
      branch: { select: { name: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Fetch attendance and reports for the period
  const [attendances, reports] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: {
        userId: payment.userId,
        date: { gte: payment.periodStart, lte: payment.periodEnd },
      },
    }),
    prisma.attendanceReport.findMany({
      where: {
        subjectType: "STAFF",
        subjectId: payment.userId,
        date: { gte: payment.periodStart, lte: payment.periodEnd },
      },
      include: {
        manager: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const presentDays = attendances.filter(a => a.present).length;
  const absentDays = attendances.filter(a => !a.present).length;
  const lateDays = attendances.filter(a => a.isLate).length;

  // Mark PDF as generated if still DRAFT
  if (payment.status === "DRAFT") {
    await prisma.staffPayment.update({
      where: { id: payment.id },
      data: { status: "PDF_GENERATED", pdfGeneratedAt: new Date() },
    });
  }

  const pdfDoc = StaffPaymentPDF({
    payment: {
      ...payment,
      deductionReason: payment.deductionReason ?? null,
      memo: payment.memo ?? null,
    },
    user: {
      name: payment.user.name,
      userId: payment.user.userId,
      role: payment.user.role,
      staffType: payment.user.staffType,
    },
    branchName: payment.branch.name,
    presentDays,
    absentDays,
    lateDays,
    reports: reports.map(r => ({
      id: r.id,
      date: r.date,
      reportType: r.reportType,
      reportKind: r.reportKind,
      content: r.content,
      isAutomatic: r.isAutomatic,
      manager: r.manager,
      teacher: r.teacher,
    })),
    generatedAt: new Date(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(pdfDoc as any);

  const safeName = payment.user.name.replace(/[^a-z0-9]/gi, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payment_${safeName}_${payment.id.slice(-8)}.pdf"`,
    },
  });
}
