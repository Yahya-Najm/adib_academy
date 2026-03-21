import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/messages/MessagesPage";
import { prisma } from "@/lib/prisma";

export default async function ManagerMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = session.user as { id: string; role: string; branchId?: string | null };

  let branches: { id: string; name: string }[] = [];
  if (user.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
      select: { id: true, name: true },
    });
    if (branch) branches = [branch];
  }

  return (
    <MessagesPage
      accent="teal"
      userId={user.id}
      userRole={user.role}
      branches={branches}
    />
  );
}
