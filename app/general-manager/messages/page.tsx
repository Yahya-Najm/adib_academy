import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/messages/MessagesPage";

export default async function GMMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <MessagesPage accent="orange" userId={session.user.id} />;
}
