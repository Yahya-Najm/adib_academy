"use server";

import { prisma } from "@/lib/prisma";
import { TransactionSource } from "@prisma/client";
import { requireManager } from "./guard";

export async function getFinancialSummary(dateFrom: string, dateTo: string, sourceType?: string) {
  const session = await requireManager();
  const branchId = session.user.branchId;
  if (!branchId) throw new Error("No branch assigned");

  const transactions = await prisma.transaction.findMany({
    where: {
      branchId,
      transactionDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      ...(sourceType && sourceType !== "ALL" ? { sourceType: sourceType as TransactionSource } : {}),
    },
  });

  const totalIncome = transactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const breakdown: Record<string, { amount: number; type: string }> = {};
  for (const t of transactions) {
    if (!breakdown[t.sourceType]) breakdown[t.sourceType] = { amount: 0, type: t.type };
    breakdown[t.sourceType].amount += t.amount;
  }

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    breakdown,
    transactionCount: transactions.length,
  };
}

export async function getTransactionLedger(dateFrom: string, dateTo: string, sourceType?: string) {
  const session = await requireManager();
  const branchId = session.user.branchId;
  if (!branchId) throw new Error("No branch assigned");

  return prisma.transaction.findMany({
    where: {
      branchId,
      transactionDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      ...(sourceType && sourceType !== "ALL" ? { sourceType: sourceType as TransactionSource } : {}),
    },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { transactionDate: "desc" },
  });
}
