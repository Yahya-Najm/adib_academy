"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

export async function getTransactions(search?: string) {
  const { branchId } = await getManagerInfo();
  return prisma.transaction.findMany({
    where: {
      branchId: branchId ?? undefined,
      sourceType: "MANUAL",  // expenses page only shows manual entries
      ...(search ? {
        OR: [
          { trackingNumber: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: { recordedBy: { select: { name: true } } },
    orderBy: { transactionDate: "desc" },
  });
}

export async function createTransaction(data: {
  trackingNumber: string;
  category: string;
  description?: string;
  amount: number;
  transactionDate: string;
}) {
  const { id: recordedById, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("Your account has no branch assigned");
  if (!data.trackingNumber.trim()) throw new Error("Tracking number is required");
  if (!data.category.trim()) throw new Error("Category is required");
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be positive");

  const existing = await prisma.transaction.findUnique({
    where: { trackingNumber: data.trackingNumber.trim() },
  });
  if (existing) throw new Error("A transaction with this tracking number already exists");

  return prisma.transaction.create({
    data: {
      trackingNumber: data.trackingNumber.trim(),
      type: "EXPENSE",
      sourceType: "MANUAL",
      category: data.category.trim(),
      description: data.description?.trim() || null,
      amount: data.amount,
      transactionDate: new Date(data.transactionDate),
      branchId,
      recordedById,
    },
  });
}

export async function updateTransaction(
  id: string,
  data: { category: string; description?: string; amount: number; transactionDate: string }
) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.branchId !== branchId) throw new Error("Transaction not found");

  return prisma.transaction.update({
    where: { id },
    data: {
      category: data.category.trim(),
      description: data.description?.trim() || null,
      amount: data.amount,
      transactionDate: new Date(data.transactionDate),
    },
  });
}

export async function deleteTransaction(id: string) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || existing.branchId !== branchId) throw new Error("Transaction not found");
  await prisma.transaction.delete({ where: { id } });
}
