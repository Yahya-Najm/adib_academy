"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireGM } from "./guard";
import { generateUserId } from "@/lib/generateUserId";

export async function getManagers() {
  await requireGM();
  return prisma.user.findMany({
    where: { role: "MANAGER" },
    select: {
      id: true, name: true, email: true, active: true,
      branchId: true,
      branch: { select: { name: true } },
      monthlySalary: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createManager(
  name: string, email: string, password: string,
  branchId: string, monthlySalary: string,
) {
  const session = await requireGM();
  if (!name.trim() || !email.trim() || !password)
    throw new Error("Name, email and password are required");
  const hashed = await bcrypt.hash(password, 10);
  const userId = await generateUserId(name);
  return prisma.user.create({
    data: {
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: "MANAGER",
      branchId: branchId || null,
      paymentType: "MONTHLY_SALARY",
      monthlySalary: monthlySalary ? Number(monthlySalary) : null,
      createdBy: session.user.id,
    },
  });
}

export async function updateManager(
  id: string, name: string, email: string,
  branchId: string, monthlySalary: string, active: boolean, newPassword?: string,
) {
  await requireGM();
  if (!name.trim() || !email.trim()) throw new Error("Name and email are required");
  const data: Record<string, unknown> = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    branchId: branchId || null,
    monthlySalary: monthlySalary ? Number(monthlySalary) : null,
    active,
  };
  if (newPassword) data.password = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({ where: { id }, data });
}

export async function deleteManager(id: string) {
  await requireGM();
  return prisma.user.delete({ where: { id } });
}
