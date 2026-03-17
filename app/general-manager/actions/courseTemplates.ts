"use server";

import { prisma } from "@/lib/prisma";
import { requireGM } from "./guard";

export async function getCourseTemplates() {
  await requireGM();
  return prisma.courseTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { id: true, name: true } } },
  });
}

export async function createCourseTemplate(data: {
  name: string;
  branchId: string | null;
  monthlyFee: number;
  durationMonths: number;
  numSections: number;
}) {
  await requireGM();
  if (!data.name.trim()) throw new Error("Course name is required");
  if (data.monthlyFee <= 0) throw new Error("Monthly fee must be positive");
  if (data.durationMonths < 1) throw new Error("Duration must be at least 1 month");
  if (data.numSections < 1) throw new Error("Must have at least 1 section");
  return prisma.courseTemplate.create({
    data: {
      name: data.name.trim(),
      branchId: data.branchId || null,
      monthlyFee: data.monthlyFee,
      durationMonths: data.durationMonths,
      numSections: data.numSections,
    },
  });
}

export async function updateCourseTemplate(
  id: string,
  data: {
    name: string;
    branchId: string | null;
    monthlyFee: number;
    durationMonths: number;
    numSections: number;
  }
) {
  await requireGM();
  if (!data.name.trim()) throw new Error("Course name is required");
  if (data.monthlyFee <= 0) throw new Error("Monthly fee must be positive");
  if (data.durationMonths < 1) throw new Error("Duration must be at least 1 month");
  if (data.numSections < 1) throw new Error("Must have at least 1 section");
  return prisma.courseTemplate.update({
    where: { id },
    data: {
      name: data.name.trim(),
      branchId: data.branchId || null,
      monthlyFee: data.monthlyFee,
      durationMonths: data.durationMonths,
      numSections: data.numSections,
    },
  });
}

export async function deleteCourseTemplate(id: string) {
  await requireGM();
  return prisma.courseTemplate.delete({ where: { id } });
}
