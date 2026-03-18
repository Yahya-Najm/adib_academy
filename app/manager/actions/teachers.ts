"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "./guard";

async function getManagerInfo() {
  const session = await requireManager();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

export async function getTeachersForBranch() {
  const { branchId } = await getManagerInfo();
  if (!branchId) return [];

  return prisma.user.findMany({
    where: { role: "TEACHER", branchId, active: true },
    select: {
      id: true, name: true, userId: true, email: true,
      paymentType: true, perClassRate: true, revenuePercentage: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeacherProfile(teacherId: string) {
  const { branchId } = await getManagerInfo();

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: {
      id: true, name: true, userId: true, email: true, active: true,
      paymentType: true, perClassRate: true, revenuePercentage: true,
      createdAt: true, branchId: true,
    },
  });
  if (!teacher || teacher.branchId !== branchId) throw new Error("Teacher not found");

  const [sections, proctorExams, reports] = await Promise.all([
    prisma.classSection.findMany({
      where: { teacherId },
      include: {
        courseClass: {
          include: { courseTemplate: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.exam.findMany({
      where: { proctorId: teacherId },
      include: {
        courseClass: { include: { courseTemplate: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.attendanceReport.findMany({
      where: { branchId: branchId!, subjectType: "TEACHER", subjectId: teacherId },
      include: {
        manager: { select: { name: true } },
        doneBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return { teacher, sections, proctorExams, reports };
}

export async function getStaffForBranch() {
  const { branchId } = await getManagerInfo();
  if (!branchId) return [];

  return prisma.user.findMany({
    where: { role: "STAFF", branchId, active: true },
    select: {
      id: true, name: true, userId: true, email: true, staffType: true,
      monthlySalary: true, createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getStaffProfile(staffId: string) {
  const { branchId } = await getManagerInfo();

  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    select: {
      id: true, name: true, userId: true, email: true, active: true,
      staffType: true, monthlySalary: true, createdAt: true, branchId: true,
    },
  });
  if (!staff || staff.branchId !== branchId) throw new Error("Staff member not found");

  const [attendances, reports] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: { userId: staffId },
      orderBy: { date: "desc" },
      take: 60,
    }),
    prisma.attendanceReport.findMany({
      where: { branchId: branchId!, subjectType: "STAFF", subjectId: staffId },
      include: {
        manager: { select: { name: true } },
        doneBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return { staff, attendances, reports };
}
