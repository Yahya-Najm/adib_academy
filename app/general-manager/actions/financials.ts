"use server";

import { prisma } from "@/lib/prisma";
import { TransactionSource } from "@prisma/client";
import { requireGM } from "./guard";

export async function getGMBranches() {
  await requireGM();
  return prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getGMFinancialSummary(
  dateFrom: string,
  dateTo: string,
  branchId?: string,
  sourceType?: string,
) {
  await requireGM();

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      ...(branchId ? { branchId } : {}),
      ...(sourceType && sourceType !== "ALL" ? { sourceType: sourceType as TransactionSource } : {}),
    },
    include: { branch: { select: { name: true } } },
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

  // Per-branch summary (when viewing all branches)
  const branchSummary: Record<string, { name: string; income: number; expenses: number }> = {};
  if (!branchId) {
    for (const t of transactions) {
      if (!branchSummary[t.branchId]) {
        branchSummary[t.branchId] = { name: t.branch.name, income: 0, expenses: 0 };
      }
      if (t.type === "INCOME") branchSummary[t.branchId].income += t.amount;
      else branchSummary[t.branchId].expenses += t.amount;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    breakdown,
    branchSummary: Object.values(branchSummary).sort((a, b) => a.name.localeCompare(b.name)),
    transactionCount: transactions.length,
  };
}

export async function getGMTransactionLedger(
  dateFrom: string,
  dateTo: string,
  branchId?: string,
  sourceType?: string,
) {
  await requireGM();

  return prisma.transaction.findMany({
    where: {
      transactionDate: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      ...(branchId ? { branchId } : {}),
      ...(sourceType && sourceType !== "ALL" ? { sourceType: sourceType as TransactionSource } : {}),
    },
    include: {
      recordedBy: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: { transactionDate: "desc" },
  });
}
