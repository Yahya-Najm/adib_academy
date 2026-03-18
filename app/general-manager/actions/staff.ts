"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireGM } from "./guard";
import { generateUserId } from "@/lib/generateUserId";

export async function getStaff() {
  await requireGM();
  return prisma.user.findMany({
    where: { role: "STAFF" },
    select: {
      id: true, name: true, email: true, active: true, staffType: true,
      branchId: true,
      branch: { select: { name: true } },
      monthlySalary: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStaff(
  name: string, email: string, staffType: string,
  branchId: string, monthlySalary: string,
) {
  const session = await requireGM();
  if (!name.trim() || !staffType.trim()) throw new Error("Name and staff type are required");
  const hashed = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
  const userId = await generateUserId(name);
  return prisma.user.create({
    data: {
      userId,
      name: name.trim(),
      email: email.trim().toLowerCase() || null,
      password: hashed,
      role: "STAFF",
      staffType: staffType.trim(),
      branchId: branchId || null,
      paymentType: "MONTHLY_SALARY",
      monthlySalary: monthlySalary ? Number(monthlySalary) : null,
      createdBy: session.user.id,
    },
  });
}

export async function updateStaff(
  id: string, name: string, email: string, staffType: string,
  branchId: string, monthlySalary: string, active: boolean,
) {
  await requireGM();
  if (!name.trim() || !staffType.trim()) throw new Error("Name and staff type are required");
  return prisma.user.update({
    where: { id },
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase() || null,
      staffType: staffType.trim(),
      branchId: branchId || null,
      monthlySalary: monthlySalary ? Number(monthlySalary) : null,
      active,
    },
  });
}

export async function deleteStaff(id: string) {
  await requireGM();
  return prisma.user.delete({ where: { id } });
}

export async function getStaffProfileGM(staffId: string) {
  await requireGM();

  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    select: {
      id: true, name: true, userId: true, email: true, active: true,
      staffType: true, monthlySalary: true, createdAt: true, branchId: true,
      branch: { select: { name: true } },
    },
  });
  if (!staff) throw new Error("Staff not found");

  const [attendances, reports] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: { userId: staffId },
      orderBy: { date: "desc" },
      take: 60,
    }),
    prisma.attendanceReport.findMany({
      where: { subjectType: "STAFF", subjectId: staffId },
      include: {
        manager: { select: { name: true } },
        branch: { select: { name: true } },
        doneBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return { staff, attendances, reports };
}
