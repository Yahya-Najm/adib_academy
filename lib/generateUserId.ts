import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/** Generate a unique slug-style userId for User records (teachers, staff, managers) */
export async function generateUserId(name: string): Promise<string> {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const base = parts.slice(0, 2).join("-").replace(/[^a-z0-9-]/g, "");
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.user.findUnique({ where: { userId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate unique user ID");
}
