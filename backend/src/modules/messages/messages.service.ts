import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { notifyUsers } from '../notifications/notifications.service';

export async function getCenterUsers(centerId: string, currentUserId: string) {
  return prisma.user.findMany({
    where: {
      centerId,
      status: 'ACTIVE',
      id: { not: currentUserId },
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  });
}

export async function listConversations(centerId: string, userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      centerId,
      participants: { some: { userId } },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calculate unread counts per conversation individually to avoid
  // cross-contamination from complex OR queries in groupBy
  const unreadMap = new Map<string, number>();

  if (conversations.length > 0) {
    const countPromises = conversations.map(async (c) => {
      const myParticipant = c.participants.find((p) => p.userId === userId);
      const lastReadAt = myParticipant?.lastReadAt || new Date(0);
      const count = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          createdAt: { gt: lastReadAt },
        },
      });
      return { conversationId: c.id, count };
    });

    const counts = await Promise.all(countPromises);
    for (const { conversationId, count } of counts) {
      unreadMap.set(conversationId, count);
    }
  }

  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    isGroup: c.isGroup,
    lastMessage: c.messages[0] || null,
    participants: c.participants.map((p) => p.user),
    updatedAt: c.updatedAt,
    unreadCount: unreadMap.get(c.id) || 0,
  }));
}

export async function createConversation(centerId: string, creatorId: string, data: {
  participantIds: string[];
  title?: string;
}) {
  const allParticipantIds = [...new Set([creatorId, ...data.participantIds])];
  const isGroup = allParticipantIds.length > 2;

  // For 1-on-1, check if conversation already exists between these two users
  if (!isGroup) {
    const otherId = data.participantIds.find((id) => id !== creatorId) || data.participantIds[0];
    const existing = await prisma.conversation.findFirst({
      where: {
        centerId,
        isGroup: false,
        AND: [
          { participants: { some: { userId: creatorId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, role: true, avatarUrl: true } },
          },
        },
      },
    });

    if (existing) {
      return {
        ...existing,
        participants: existing.participants.map((p) => p.user),
      };
    }
  }

  // Auto-generate title for 1-on-1 if not provided
  let title = data.title;
  if (!title && !isGroup) {
    const otherId = data.participantIds.find((id) => id !== creatorId) || data.participantIds[0];
    const otherUser = await prisma.user.findUnique({ where: { id: otherId }, select: { name: true } });
    title = otherUser?.name || 'Conversation';
  }

  const conversation = await prisma.conversation.create({
    data: {
      centerId,
      title: title || 'Group Chat',
      isGroup,
      participants: {
        create: allParticipantIds.map((userId) => ({ userId })),
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
      },
    },
  });

  return {
    ...conversation,
    participants: conversation.participants.map((p) => p.user),
  };
}

export async function getMessages(centerId: string, conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      centerId,
      participants: { some: { userId } },
    },
    include: {
      participants: {
        where: { userId },
        select: { lastReadAt: true },
      },
    },
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  const lastReadAt = conversation.participants[0]?.lastReadAt || new Date(0);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return messages.map((m) => ({
    ...m,
    isUnread: m.senderId !== userId && m.createdAt > lastReadAt,
  }));
}

export async function markAsRead(centerId: string, conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      centerId,
      participants: { some: { userId } },
    },
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });

  return { success: true };
}

export async function sendMessage(centerId: string, conversationId: string, senderId: string, data: {
  content: string;
  type?: string;
}) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      centerId,
      participants: { some: { userId: senderId } },
    },
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: data.content,
      type: data.type || 'text',
    },
    include: {
      sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Notify other participants about the new message
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true },
  });
  const recipientIds = participants.map((p) => p.userId);
  if (recipientIds.length > 0) {
    const preview = data.content.length > 60 ? data.content.slice(0, 60) + '...' : data.content;
    try {
      await notifyUsers(
        centerId,
        recipientIds,
        `New Message from ${message.sender.name}`,
        preview,
        '/messages',
      );
    } catch (err) {
      console.error('[Messages] Failed to notify users:', err);
      // Don't throw — notification failure shouldn't block message delivery
    }
  }

  return message;
}
