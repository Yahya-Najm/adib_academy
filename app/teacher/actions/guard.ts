import { auth } from "@/auth";

export async function requireTeacher() {
  const session = await auth();
  if (!session || session.user.role !== "TEACHER") throw new Error("Unauthorized");
  return session;
}
