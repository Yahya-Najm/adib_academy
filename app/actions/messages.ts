"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_MESSAGE_LENGTH = 1000;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function getContacts() {
  const session = await requireAuth();
  const { id, role, branchId } = session.user as { id: string; role: string; branchId?: string | null };

  if (role === "GENERAL_MANAGER") {
    return prisma.user.findMany({
      where: { role: { in: ["MANAGER", "TEACHER", "STAFF"] }, active: true },
      select: {
        id: true,
        name: true,
        role: true,
        staffType: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    });
  }

  if (role === "MANAGER") {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "GENERAL_MANAGER" },
          { role: { in: ["TEACHER", "STAFF"] }, branchId: branchId ?? undefined },
        ],
      },
      select: {
        id: true,
        name: true,
        role: true,
        staffType: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return users.filter((u) => u.id !== id);
  }

  if (role === "TEACHER") {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { role: "GENERAL_MANAGER" },
          { role: { in: ["MANAGER", "STAFF"] }, branchId: branchId ?? undefined },
        ],
      },
      select: {
        id: true,
        name: true,
        role: true,
        staffType: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return users.filter((u) => u.id !== id);
  }

  return [];
}

export async function getConversations() {
  const session = await requireAuth();
  const userId = session.user.id!;

  const messages = await prisma.message.findMany({
    where: {
      channel: "DIRECT",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      sender: { select: { id: true, name: true, role: true } },
      receiver: { select: { id: true, name: true, role: true } },
    },
  });

  const conversationMap = new Map<string, (typeof messages)[0]>();
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.receiverId! : msg.senderId;
    if (!conversationMap.has(otherId)) {
      conversationMap.set(otherId, msg);
    }
  }

  const conversations = [];
  for (const [otherId, latestMsg] of conversationMap) {
    const other =
      latestMsg.senderId === userId ? latestMsg.receiver! : latestMsg.sender;
    const unreadCount = messages.filter(
      (m) => m.senderId === otherId && m.receiverId === userId && !m.read
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

  return conversations.sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
  );
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
    take: 100,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

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

export async function getBranchGeneralMessages(branchId: string) {
  const session = await requireAuth();
  const { role, branchId: userBranchId } = session.user as {
    role: string;
    branchId?: string | null;
  };

  if (role !== "GENERAL_MANAGER" && userBranchId !== branchId) {
    throw new Error("Unauthorized");
  }

  return prisma.message.findMany({
    where: { channel: "BRANCH_GENERAL", branchId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function sendMessage(data: {
  receiverId?: string;
  channel: "DIRECT" | "BRANCH_GENERAL";
  content: string;
  branchId?: string;
}) {
  const session = await requireAuth();
  const { id: senderId, role, branchId } = session.user as {
    id: string;
    role: string;
    branchId?: string | null;
  };

  if (!data.content.trim()) throw new Error("Message cannot be empty");
  if (data.content.length > MAX_MESSAGE_LENGTH)
    throw new Error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);

  if (data.channel === "DIRECT") {
    if (!data.receiverId) throw new Error("Recipient is required for direct messages");

    const receiver = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { id: true, role: true, branchId: true },
    });
    if (!receiver) throw new Error("Recipient not found");

    if (role === "GENERAL_MANAGER") {
      if (!["MANAGER", "TEACHER", "STAFF"].includes(receiver.role)) {
        throw new Error("You can only message managers, teachers, and staff");
      }
    } else if (role === "MANAGER") {
      if (receiver.role === "GENERAL_MANAGER") {
        // OK
      } else if (
        ["TEACHER", "STAFF"].includes(receiver.role) &&
        receiver.branchId === branchId
      ) {
        // OK
      } else {
        throw new Error(
          "You can only message the GM, teachers, or staff in your branch"
        );
      }
    } else if (role === "TEACHER") {
      if (receiver.role === "GENERAL_MANAGER") {
        // OK
      } else if (
        ["MANAGER", "STAFF"].includes(receiver.role) &&
        receiver.branchId === branchId
      ) {
        // OK
      } else {
        throw new Error(
          "You can only message the GM, your branch manager, or branch staff"
        );
      }
    } else {
      throw new Error("Unauthorized");
    }

    return prisma.message.create({
      data: {
        senderId,
        receiverId: data.receiverId,
        channel: "DIRECT",
        content: data.content.trim(),
      },
    });
  }

  if (data.channel === "BRANCH_GENERAL") {
    const targetBranchId = data.branchId;
    if (!targetBranchId) throw new Error("Branch is required for branch general messages");

    if (role !== "GENERAL_MANAGER" && branchId !== targetBranchId) {
      throw new Error("Unauthorized");
    }

    if (!["GENERAL_MANAGER", "MANAGER", "TEACHER"].includes(role)) {
      throw new Error("Unauthorized");
    }

    return prisma.message.create({
      data: {
        senderId,
        channel: "BRANCH_GENERAL",
        branchId: targetBranchId,
        content: data.content.trim(),
      },
    });
  }

  throw new Error("Invalid channel");
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
