import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/messages/MessagesPage";
import { prisma } from "@/lib/prisma";

export default async function GMMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const branches = await prisma.branch.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <MessagesPage
      accent="orange"
      userId={session.user.id}
      userRole="GENERAL_MANAGER"
      branches={branches}
    />
  );
}
