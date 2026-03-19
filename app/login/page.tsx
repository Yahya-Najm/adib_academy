import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

// If the user is already authenticated, send them directly to their dashboard.
// No sign-up — all accounts are created by the General Manager.
export default async function LoginPage() {
  const session = await auth();

  if (session) {
    const roleRoutes: Record<string, string> = {
      GENERAL_MANAGER: "/general-manager",
      MANAGER: "/manager",
      TEACHER: "/teacher",
    };
    redirect(roleRoutes[session.user.role] ?? "/dashboard");
  }

  return <LoginForm />;
}
