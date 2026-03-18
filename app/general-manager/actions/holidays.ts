"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

// ── One-off official holidays ─────────────────────────────────────────────────

export async function getHolidays() {
  await requireGM();
  return prisma.officialHoliday.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
}

export async function createHoliday(data: {
  name: string;
  date: string;
  branchId?: string;
}) {
  await requireGM();
  if (!data.name.trim()) throw new Error("Holiday name/reason is required");
  if (!data.date) throw new Error("Date is required");

  return prisma.officialHoliday.create({
    data: {
      name: data.name.trim(),
      date: new Date(data.date),
      branchId: data.branchId || null,
    },
  });
}

export async function deleteHoliday(id: string) {
  await requireGM();
  await prisma.officialHoliday.delete({ where: { id } });
}

// ── Weekly recurring holidays ─────────────────────────────────────────────────

export async function getWeeklyHolidays() {
  await requireGM();
  return prisma.weeklyHoliday.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: [{ branchId: "asc" }, { dayOfWeek: "asc" }],
  });
}

export async function createWeeklyHoliday(data: {
  dayOfWeek: string;
  branchId?: string;
}) {
  await requireGM();
  const valid = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  if (!valid.includes(data.dayOfWeek)) throw new Error("Invalid day of week");

  const existing = await prisma.weeklyHoliday.findFirst({
    where: { dayOfWeek: data.dayOfWeek, branchId: data.branchId ?? null },
  });
  if (existing) throw new Error(`${data.dayOfWeek} is already set as a weekly holiday for this scope`);

  return prisma.weeklyHoliday.create({
    data: { dayOfWeek: data.dayOfWeek, branchId: data.branchId || null },
  });
}

export async function deleteWeeklyHoliday(id: string) {
  await requireGM();
  await prisma.weeklyHoliday.delete({ where: { id } });
}
