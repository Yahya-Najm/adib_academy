import { auth } from "@/auth";

export async function requireGM() {
  const session = await auth();
  if (!session || session.user.role !== "GENERAL_MANAGER") throw new Error("Unauthorized");
  return session;
}
