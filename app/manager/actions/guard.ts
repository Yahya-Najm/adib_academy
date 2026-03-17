import { auth } from "@/auth";

export async function requireManager() {
  const session = await auth();
  if (!session || session.user.role !== "MANAGER") throw new Error("Unauthorized");
  return session;
}
