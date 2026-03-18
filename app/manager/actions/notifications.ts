"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

export async function getPaymentNotifications() {
  const session = await requireManager();
  const branchId = session.user.branchId ?? null;

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999);

  return prisma.monthlyPayment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lte: threeDaysFromNow },
      enrollment: {
        status: "ACTIVE",
        student: { branchId: branchId ?? undefined },
      },
    },
    include: {
      enrollment: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
          courseClass: { include: { courseTemplate: { select: { name: true } } } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}
