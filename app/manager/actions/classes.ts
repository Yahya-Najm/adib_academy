"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";
import { generateClassId } from "@/lib/generateClassId";

// ── helpers ──────────────────────────────────────────────────────────────────

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

// ── reads ─────────────────────────────────────────────────────────────────────

export async function getClasses() {
  const { id } = await getManagerInfo();
  return prisma.courseClass.findMany({
    where: { managerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      courseTemplate: { select: { name: true, numSections: true, durationMonths: true, monthlyFee: true } },
      branch: { select: { name: true } },
      sections: {
        orderBy: { sectionNumber: "asc" },
        include: { teacher: { select: { id: true, name: true } } },
      },
      exams: { orderBy: { date: "asc" } },
    },
  });
}

export async function getCourseTemplatesForManager() {
  const { branchId } = await getManagerInfo();
  return prisma.courseTemplate.findMany({
    where: {
      OR: [
        { branchId: null },
        ...(branchId ? [{ branchId }] : []),
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, numSections: true, durationMonths: true, monthlyFee: true },
  });
}

export async function getTeachersForManager() {
  const { branchId } = await getManagerInfo();
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER", active: true },
    select: {
      id: true, name: true, branchId: true,
      branch: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  // Own branch first, then everyone else
  const own = teachers.filter(t => t.branchId === branchId);
  const others = teachers.filter(t => t.branchId !== branchId);
  return { own, others };
}

// ── writes ────────────────────────────────────────────────────────────────────

interface SectionInput {
  sectionNumber: number;
  sectionName: string;
  teacherId: string;
}

export async function createClass(data: {
  courseTemplateId: string;
  startDate: string;
  classTime: string;
  offDays: string[];
  sections: SectionInput[];
}) {
  const { id: managerId, branchId } = await getManagerInfo();
  if (!branchId) throw new Error("Your account has no branch assigned — contact the General Manager");

  const template = await prisma.courseTemplate.findUnique({ where: { id: data.courseTemplateId } });
  if (!template) throw new Error("Course template not found");
  if (data.sections.length !== template.numSections)
    throw new Error(`This template requires exactly ${template.numSections} section(s)`);
  if (data.sections.some(s => !s.teacherId))
    throw new Error("Each section must have a teacher assigned");

  const classId = await generateClassId(template.name);

  return prisma.courseClass.create({
    data: {
      classId,
      courseTemplateId: data.courseTemplateId,
      branchId,
      managerId,
      startDate: new Date(data.startDate),
      classTime: data.classTime,
      offDays: data.offDays,
      sections: {
        create: data.sections.map(s => ({
          sectionNumber: s.sectionNumber,
          sectionName: s.sectionName.trim() || null,
          teacherId: s.teacherId,
        })),
      },
    },
  });
}

export async function updateClass(
  id: string,
  data: {
    startDate: string;
    classTime: string;
    offDays: string[];
    status: string;
    sections: SectionInput[];
  }
) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.courseClass.findUnique({
    where: { id },
    include: { courseTemplate: { select: { numSections: true } } },
  });
  if (!existing) throw new Error("Class not found");
  if (existing.branchId !== branchId) throw new Error("Class not found");
  if (data.sections.length !== existing.courseTemplate.numSections)
    throw new Error(`This template requires exactly ${existing.courseTemplate.numSections} section(s)`);
  if (data.sections.some(s => !s.teacherId))
    throw new Error("Each section must have a teacher assigned");

  return prisma.courseClass.update({
    where: { id },
    data: {
      startDate: new Date(data.startDate),
      classTime: data.classTime,
      offDays: data.offDays,
      status: data.status as "ACTIVE" | "COMPLETED" | "CANCELLED",
      sections: {
        deleteMany: {},
        create: data.sections.map(s => ({
          sectionNumber: s.sectionNumber,
          sectionName: s.sectionName.trim() || null,
          teacherId: s.teacherId,
        })),
      },
    },
  });
}

export async function deleteClass(id: string) {
  const { branchId } = await getManagerInfo();
  const existing = await prisma.courseClass.findUnique({ where: { id } });
  if (!existing || existing.branchId !== branchId) throw new Error("Class not found");
  return prisma.courseClass.delete({ where: { id } });
}
