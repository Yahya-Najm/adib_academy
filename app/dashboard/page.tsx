import { auth } from "@/auth";
import { redirect } from "next/navigation";

const roleRoutes: Record<string, string> = {
  GENERAL_MANAGER: "/general-manager",
  MANAGER: "/manager",
  TEACHER: "/teacher",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(roleRoutes[session.user.role] ?? "/login");
}
