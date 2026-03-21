import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/messages/MessagesPage";

export default async function ManagerMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <MessagesPage accent="teal" userId={session.user.id} />;
}
