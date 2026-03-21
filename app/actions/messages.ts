"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function getContacts() {
  const session = await requireAuth();
  const { id, role, branchId } = session.user as { id: string; role: string; branchId?: string | null };

  if (role === "GENERAL_MANAGER") {
    // GM can message any manager or teacher
    const users = await prisma.user.findMany({
      where: { role: { in: ["MANAGER", "TEACHER"] }, active: true },
      select: { id: true, name: true, role: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return users;
  }

  if (role === "MANAGER") {
    // Manager can message teachers in their branch + GM
    const users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "GENERAL_MANAGER" },
          { role: "TEACHER", branchId: branchId ?? undefined },
        ],
      },
      select: { id: true, name: true, role: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return users.filter(u => u.id !== id);
  }

  if (role === "TEACHER") {
    // Teacher can message their branch manager + GM
    const users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "GENERAL_MANAGER" },
          { role: "MANAGER", branchId: branchId ?? undefined },
        ],
      },
      select: { id: true, name: true, role: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return users.filter(u => u.id !== id);
  }

  return [];
}

export async function getConversations() {
  const session = await requireAuth();
  const userId = session.user.id!;

  // Get all direct messages involving this user
  const messages = await prisma.message.findMany({
    where: {
      channel: "DIRECT",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, role: true } },
      receiver: { select: { id: true, name: true, role: true } },
    },
  });

  // Group by other user, pick latest message per conversation
  const conversationMap = new Map<string, typeof messages[0]>();
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId! : msg.senderId;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, msg);
    }
  }

  // Count unread per conversation
  const conversations = [];
  for (const [otherId, latestMsg] of conversationMap) {
    const other = latestMsg.senderId === userId ? latestMsg.receiver! : latestMsg.sender;
    const unreadCount = messages.filter(
      m => m.senderId === otherId && m.receiverId === userId && !m.read
    ).length;
    conversations.push({
      otherUserId: otherId,
      otherName: other.name,
      otherRole: other.role,
      lastMessage: latestMsg.content,
      lastMessageAt: latestMsg.createdAt,
      isMine: latestMsg.senderId === userId,
      unreadCount,
    });
  }

  return conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

export async function getConversation(otherUserId: string) {
  const session = await requireAuth();
  const userId = session.user.id!;

  const messages = await prisma.message.findMany({
    where: {
      channel: "DIRECT",
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      channel: "DIRECT",
      senderId: otherUserId,
      receiverId: userId,
      read: false,
    },
    data: { read: true },
  });

  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, name: true, role: true },
  });

  return { messages, otherUser };
}

export async function getGeneralMessages() {
  const session = await requireAuth();

  return prisma.message.findMany({
    where: { channel: "GENERAL" },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function sendMessage(data: {
  receiverId?: string;
  channel: "DIRECT" | "GENERAL";
  content: string;
}) {
  const session = await requireAuth();
  const { id: senderId, role, branchId } = session.user as { id: string; role: string; branchId?: string | null };

  if (!data.content.trim()) throw new Error("Message cannot be empty");

  if (data.channel === "DIRECT") {
    if (!data.receiverId) throw new Error("Recipient is required for direct messages");

    const receiver = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { id: true, role: true, branchId: true },
    });
    if (!receiver) throw new Error("Recipient not found");

    // Permission checks
    if (role === "GENERAL_MANAGER") {
      if (!["MANAGER", "TEACHER"].includes(receiver.role)) {
        throw new Error("You can only message managers and teachers");
      }
    } else if (role === "MANAGER") {
      if (receiver.role === "GENERAL_MANAGER") {
        // OK
      } else if (receiver.role === "TEACHER" && receiver.branchId === branchId) {
        // OK
      } else {
        throw new Error("You can only message the GM or teachers in your branch");
      }
    } else if (role === "TEACHER") {
      if (receiver.role === "GENERAL_MANAGER") {
        // OK
      } else if (receiver.role === "MANAGER" && receiver.branchId === branchId) {
        // OK
      } else {
        throw new Error("You can only message the GM or your branch manager");
      }
    } else {
      throw new Error("Unauthorized");
    }
  }

  return prisma.message.create({
    data: {
      senderId,
      receiverId: data.channel === "DIRECT" ? data.receiverId! : null,
      channel: data.channel,
      content: data.content.trim(),
    },
  });
}

export async function markAsRead(messageId: string) {
  const session = await requireAuth();
  const userId = session.user.id!;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.receiverId !== userId) throw new Error("Message not found");

  return prisma.message.update({
    where: { id: messageId },
    data: { read: true },
  });
}

export async function getUnreadCount() {
  const session = await requireAuth();
  const userId = session.user.id!;

  return prisma.message.count({
    where: {
      receiverId: userId,
      channel: "DIRECT",
      read: false,
    },
  });
}
