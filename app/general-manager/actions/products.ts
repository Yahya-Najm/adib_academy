"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

export async function getProducts() {
  await requireGM();
  return prisma.product.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProduct(data: {
  name: string;
  price: number;
  stock: number;
  branchId: string;
}) {
  await requireGM();
  if (!data.name.trim()) throw new Error("Product name is required");
  if (!data.branchId) throw new Error("Branch is required");
  if (data.price < 0) throw new Error("Price cannot be negative");
  if (data.stock < 0) throw new Error("Stock cannot be negative");

  return prisma.product.create({
    data: {
      name: data.name.trim(),
      price: data.price,
      stock: data.stock,
      branchId: data.branchId,
    },
  });
}

export async function updateProduct(
  id: string,
  data: { name: string; price: number; stock: number; branchId: string }
) {
  await requireGM();
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");

  return prisma.product.update({
    where: { id },
    data: {
      name: data.name.trim(),
      price: data.price,
      stock: data.stock,
      branchId: data.branchId,
    },
  });
}

export async function deleteProduct(id: string) {
  await requireGM();
  await prisma.product.delete({ where: { id } });
}
