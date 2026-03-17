"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

export async function getBranches() {
  await requireGM();
  return prisma.branch.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createBranch(name: string, address: string) {
  await requireGM();
  if (!name.trim()) throw new Error("Branch name is required");
  return prisma.branch.create({
    data: { name: name.trim(), address: address.trim() || null },
  });
}

export async function updateBranch(id: string, name: string, address: string) {
  await requireGM();
  if (!name.trim()) throw new Error("Branch name is required");
  return prisma.branch.update({
    where: { id },
    data: { name: name.trim(), address: address.trim() || null },
  });
}

export async function deleteBranch(id: string) {
  await requireGM();
  try {
    return await prisma.branch.delete({ where: { id } });
  } catch {
    throw new Error("Cannot delete branch — it still has staff assigned to it");
  }
}
