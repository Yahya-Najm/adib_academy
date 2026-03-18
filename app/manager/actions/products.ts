"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

export async function getProductsForBranch() {
  const { branchId } = await getManagerInfo();
  return prisma.product.findMany({
    where: { branchId: branchId ?? undefined },
    orderBy: { name: "asc" },
  });
}

export async function getSalesHistory() {
  const { branchId } = await getManagerInfo();
  return prisma.productSale.findMany({
    where: { branchId: branchId ?? undefined },
    include: {
      product: { select: { name: true } },
      soldBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function recordSale(productId: string, quantity: number) {
  const { id: soldById, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("Your account has no branch assigned");
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.branchId !== branchId) throw new Error("Product not found");
  if (product.stock < quantity) throw new Error(`Insufficient stock (available: ${product.stock})`);

  const totalPrice = product.price * quantity;

  await prisma.$transaction([
    prisma.productSale.create({
      data: { productId, quantity, totalPrice, soldById, branchId },
    }),
    prisma.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    }),
  ]);
}
