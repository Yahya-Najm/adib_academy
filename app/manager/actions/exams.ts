"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

export async function getExams(courseClassId: string) {
  await requireManager();
  return prisma.exam.findMany({
    where: { courseClassId },
    orderBy: { date: "asc" },
  });
}

export async function createExam(data: {
  courseClassId: string;
  title: string;
  date: string;
  description: string;
}) {
  await requireManager();
  if (!data.title.trim()) throw new Error("Exam title is required");
  if (!data.date) throw new Error("Exam date is required");
  return prisma.exam.create({
    data: {
      courseClassId: data.courseClassId,
      title: data.title.trim(),
      date: new Date(data.date),
      description: data.description.trim() || null,
    },
  });
}

export async function updateExam(
  id: string,
  data: { title: string; date: string; description: string }
) {
  await requireManager();
  if (!data.title.trim()) throw new Error("Exam title is required");
  return prisma.exam.update({
    where: { id },
    data: {
      title: data.title.trim(),
      date: new Date(data.date),
      description: data.description.trim() || null,
    },
  });
}

export async function deleteExam(id: string) {
  await requireManager();
  return prisma.exam.delete({ where: { id } });
}
