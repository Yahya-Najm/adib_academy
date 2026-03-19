"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "./guard";

export async function getStudentProfileForTeacher(studentDbId: string) {
  const session = await requireTeacher();
  const teacherId = session.user.id;

  // Verify student is in one of teacher's classes
  const sections = await prisma.classSection.findMany({
    where: { teacherId },
    select: { courseClassId: true },
  });
  const classIds = [...new Set(sections.map(s => s.courseClassId))];

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { studentId: studentDbId, courseClassId: { in: classIds }, status: "ACTIVE" },
  });
  if (!enrollment) throw new Error("Student not in your classes");

  const student = await prisma.student.findUnique({
    where: { id: studentDbId },
    include: {
      enrollments: {
        include: {
          courseClass: {
            include: { courseTemplate: { select: { name: true } } },
          },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!student) throw new Error("Student not found");
  return student;
}
