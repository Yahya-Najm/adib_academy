import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/** Generate a unique slug-style classId for CourseClass records */
export async function generateClassId(templateName: string): Promise<string> {
  const parts = templateName.trim().toLowerCase().split(/\s+/);
  const base = parts.slice(0, 2).join("-").replace(/[^a-z0-9-]/g, "");
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.courseClass.findUnique({ where: { classId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate unique class ID");
}
