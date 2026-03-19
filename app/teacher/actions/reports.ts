"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "./guard";

async function getTeacherInfo() {
  const session = await requireTeacher();
  return { id: session.user.id, branchId: session.user.branchId ?? null };
}

/** Get all class IDs for this teacher (to scope subject access) */
async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const sections = await prisma.classSection.findMany({
    where: { teacherId },
    select: { courseClassId: true },
  });
  return [...new Set(sections.map(s => s.courseClassId))];
}

/** Get all active student IDs enrolled in teacher's classes */
async function getTeacherStudentIds(classIds: string[]): Promise<string[]> {
  if (classIds.length === 0) return [];
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseClassId: { in: classIds }, status: "ACTIVE" },
    select: { studentId: true },
  });
  return [...new Set(enrollments.map(e => e.studentId))];
}

export async function createTeacherReport(data: {
  date: string;
  subjectType: "STUDENT" | "CLASS";
  subjectId: string;
  reportKind: "SIMPLE" | "ACTIONABLE";
  reportType: string;
  content: string;
  actionDescription?: string;
}) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");
  if (!data.reportType.trim()) throw new Error("Report type is required");
  if (!data.content.trim()) throw new Error("Report content is required");
  if (data.reportKind === "ACTIONABLE" && !data.actionDescription?.trim())
    throw new Error("Action description is required for actionable reports");

  // Verify subject belongs to teacher's classes
  const classIds = await getTeacherClassIds(teacherId);

  if (data.subjectType === "CLASS") {
    if (!classIds.includes(data.subjectId)) throw new Error("Class not found in your assigned classes");
  } else if (data.subjectType === "STUDENT") {
    const studentIds = await getTeacherStudentIds(classIds);
    if (!studentIds.includes(data.subjectId)) throw new Error("Student not found in your classes");
  }

  const date = new Date(data.date);
  return prisma.attendanceReport.create({
    data: {
      date,
      branchId,
      teacherId,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      isAutomatic: false,
      reportKind: data.reportKind,
      reportType: data.reportType.trim(),
      content: data.content.trim(),
      actionDescription: data.reportKind === "ACTIONABLE" ? data.actionDescription?.trim() : null,
      isDone: data.reportKind === "ACTIONABLE" ? false : null,
    },
  });
}

export async function deleteTeacherReport(id: string) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  const report = await prisma.attendanceReport.findUnique({ where: { id } });
  if (!report || report.teacherId !== teacherId) throw new Error("Report not found");
  if (report.isAutomatic) throw new Error("Auto-generated reports cannot be deleted");

  await prisma.attendanceReport.delete({ where: { id } });
}

export async function markTeacherReportDone(id: string, done: boolean) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  const report = await prisma.attendanceReport.findUnique({ where: { id } });
  if (!report || report.branchId !== branchId) throw new Error("Report not found");
  if (report.reportKind !== "ACTIONABLE") throw new Error("Only actionable reports can be marked done");

  return prisma.attendanceReport.update({
    where: { id },
    data: {
      isDone: done,
      doneAt: done ? new Date() : null,
      doneById: done ? teacherId : null,
    },
  });
}

/** Reports written by this teacher */
export async function getMyReports(subjectType?: string, reportKind?: string) {
  const { id: teacherId } = await getTeacherInfo();

  const reports = await prisma.attendanceReport.findMany({
    where: {
      teacherId,
      ...(subjectType ? { subjectType } : {}),
      ...(reportKind ? { reportKind: reportKind as "SIMPLE" | "ACTIONABLE" } : {}),
    },
    include: {
      teacher: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build subject name map
  const classIds = [...new Set(reports.filter(r => r.subjectType === "CLASS").map(r => r.subjectId))];
  const studentIds = [...new Set(reports.filter(r => r.subjectType === "STUDENT").map(r => r.subjectId))];

  const [classes, students] = await Promise.all([
    classIds.length ? prisma.courseClass.findMany({
      where: { id: { in: classIds } },
      include: { courseTemplate: { select: { name: true } } },
    }) : [],
    studentIds.length ? prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, studentId: true },
    }) : [],
  ]);

  const nameMap: Record<string, string> = {};
  classes.forEach(c => { nameMap[c.id] = c.courseTemplate.name; });
  students.forEach(s => { nameMap[s.id] = `${s.firstName} ${s.lastName}`; });

  return reports.map(r => ({ ...r, subjectName: nameMap[r.subjectId] ?? r.subjectId }));
}

/** Pending actionable reports written by this teacher */
export async function getMyPendingActionableReports() {
  const { id: teacherId } = await getTeacherInfo();

  const reports = await prisma.attendanceReport.findMany({
    where: { teacherId, reportKind: "ACTIONABLE", isDone: false },
    include: {
      teacher: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const classIds = [...new Set(reports.filter(r => r.subjectType === "CLASS").map(r => r.subjectId))];
  const studentIds = [...new Set(reports.filter(r => r.subjectType === "STUDENT").map(r => r.subjectId))];

  const [classes, students] = await Promise.all([
    classIds.length ? prisma.courseClass.findMany({
      where: { id: { in: classIds } },
      include: { courseTemplate: { select: { name: true } } },
    }) : [],
    studentIds.length ? prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true },
    }) : [],
  ]);

  const nameMap: Record<string, string> = {};
  classes.forEach(c => { nameMap[c.id] = c.courseTemplate.name; });
  students.forEach(s => { nameMap[s.id] = `${s.firstName} ${s.lastName}`; });

  return reports.map(r => ({ ...r, subjectName: nameMap[r.subjectId] ?? r.subjectId }));
}

/** Reports for a specific student (for profile page) — scoped to teacher's classes */
export async function getReportsForStudentByTeacher(studentDbId: string) {
  const { id: teacherId, branchId } = await getTeacherInfo();
  if (!branchId) throw new Error("No branch assigned");

  const classIds = await getTeacherClassIds(teacherId);
  const studentIds = await getTeacherStudentIds(classIds);
  if (!studentIds.includes(studentDbId)) throw new Error("Student not in your classes");

  return prisma.attendanceReport.findMany({
    where: { branchId, subjectType: "STUDENT", subjectId: studentDbId },
    include: {
      manager: { select: { name: true } },
      teacher: { select: { name: true } },
      doneBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}

/** Subjects available for teacher to report on */
export async function getTeacherReportableSubjects() {
  const { id: teacherId } = await getTeacherInfo();
  const classIds = await getTeacherClassIds(teacherId);

  const [students, classes] = await Promise.all([
    classIds.length ? prisma.courseEnrollment.findMany({
      where: { courseClassId: { in: classIds }, status: "ACTIVE" },
      include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } } },
    }) : [],
    classIds.length ? prisma.courseClass.findMany({
      where: { id: { in: classIds }, status: "ACTIVE" },
      include: { courseTemplate: { select: { name: true } } },
    }) : [],
  ]);

  const uniqueStudents = [...new Map(
    students.map(e => [e.student.id, e.student])
  ).values()];

  return { students: uniqueStudents, classes };
}
