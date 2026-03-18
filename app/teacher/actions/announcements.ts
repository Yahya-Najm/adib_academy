"use server";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "./guard";

export async function getTeacherAnnouncements() {
  const session = await requireTeacher();
  const branchId = session.user.branchId ?? null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.officialHoliday.findMany({
    where: {
      date: { gte: today },
      OR: [
        { branchId: null },
        ...(branchId ? [{ branchId }] : []),
      ],
    },
    orderBy: { date: "asc" },
    include: { branch: { select: { name: true } } },
  });
}
