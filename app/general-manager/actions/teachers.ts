"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireGM } from "./guard";

export async function getTeachers() {
  await requireGM();
  return prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true, name: true, email: true, active: true,
      branchId: true,
      branch: { select: { name: true } },
      paymentType: true, perClassRate: true, revenuePercentage: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTeacher(
  name: string, email: string, password: string, branchId: string,
  paymentType: string, perClassRate: string, revenuePercentage: string,
) {
  const session = await requireGM();
  if (!name.trim() || !email.trim() || !password || !paymentType)
    throw new Error("Name, email, password and payment type are required");
  if (!["PER_CLASS", "REVENUE_PERCENTAGE"].includes(paymentType))
    throw new Error("Invalid payment type for teacher");
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: "TEACHER",
      branchId: branchId || null,
      paymentType: paymentType as "PER_CLASS" | "REVENUE_PERCENTAGE",
      perClassRate: paymentType === "PER_CLASS" && perClassRate ? Number(perClassRate) : null,
      revenuePercentage: paymentType === "REVENUE_PERCENTAGE" && revenuePercentage ? Number(revenuePercentage) : null,
      createdBy: session.user.id,
    },
  });
}

export async function updateTeacher(
  id: string, name: string, email: string, branchId: string,
  paymentType: string, perClassRate: string, revenuePercentage: string,
  active: boolean, newPassword?: string,
) {
  await requireGM();
  if (!name.trim() || !email.trim()) throw new Error("Name and email are required");
  if (!["PER_CLASS", "REVENUE_PERCENTAGE"].includes(paymentType))
    throw new Error("Invalid payment type");
  const data: Record<string, unknown> = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    branchId: branchId || null,
    paymentType,
    perClassRate: paymentType === "PER_CLASS" && perClassRate ? Number(perClassRate) : null,
    revenuePercentage: paymentType === "REVENUE_PERCENTAGE" && revenuePercentage ? Number(revenuePercentage) : null,
    active,
  };
  if (newPassword) data.password = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({ where: { id }, data });
}

export async function deleteTeacher(id: string) {
  await requireGM();
  return prisma.user.delete({ where: { id } });
}
