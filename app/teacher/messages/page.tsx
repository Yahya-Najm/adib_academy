import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "@/components/messages/MessagesPage";

export default async function TeacherMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <MessagesPage accent="dark" userId={session.user.id} />;
}
