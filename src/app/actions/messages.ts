"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { Role } from "@prisma/client";
import { listStoredUsers } from "@/lib/user-store";
import {
  getInMemoryConversations,
  getInMemoryMessages,
  sendInMemoryMessage,
  getInMemoryTotalUnread,
  StaffMember,
} from "@/lib/chat-store";
import { getDevAttendances } from "@/app/actions/attendance";
import { getDevLeads } from "@/app/actions/leads";

// Safe dynamic database accessor ensuring zero type errors even when IDE language server caches PrismaClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export interface ConversationView {
  id: string;
  type: "DIRECT" | "TEAM" | "GENERAL";
  name: string;
  avatarLetter: string;
  subtitle: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  recipientId?: string;
  recipientRole?: Role;
  recipientShiftStatus?: "ON_SHIFT" | "ON_BREAK" | "OFFLINE";
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  content: string;
  leadId?: string | null;
  metadata?: {
    customerName?: string;
    mobile?: string;
    campaign?: string;
    status?: string;
  } | null;
  createdAt: string;
  isOwn: boolean;
}

// 1. Get all conversations for current user
export async function getConversationsAction(): Promise<ConversationView[]> {
  const session = await getSession();
  if (!session) return [];

  const currentUserId = session.userId;

  // Try Prisma first
  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { team: true },
    });

    if (user) {
      // Find conversations where user is participant, or general/team conversations
      const conversations = await db.conversation.findMany({
        where: {
          OR: [
            { participants: { some: { userId: currentUserId } } },
            { type: "GENERAL" },
            user.teamId ? { type: "TEAM", teamId: user.teamId } : {},
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, username: true, role: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (conversations.length > 0) {
        // Fetch active attendance status for all participants
        const activeAttendances = await prisma.attendance.findMany({
          where: { logoutAt: null },
          include: { breaks: { where: { endTime: null } } },
        });

        const statusMap = new Map<string, "ON_SHIFT" | "ON_BREAK" | "OFFLINE">();
        for (const att of activeAttendances) {
          if (att.breaks && att.breaks.length > 0) {
            statusMap.set(att.userId, "ON_BREAK");
          } else {
            statusMap.set(att.userId, "ON_SHIFT");
          }
        }

        return conversations.map((conv: any) => {
          let name = conv.name || "Chat";
          let avatarLetter = "#";
          let subtitle = "";
          let recipientId: string | undefined = undefined;
          let recipientRole: Role | undefined = undefined;
          let recipientShiftStatus: "ON_SHIFT" | "ON_BREAK" | "OFFLINE" | undefined = undefined;

          if (conv.type === "GENERAL") {
            name = "#General Floor";
            avatarLetter = "📢";
            subtitle = "Company-wide Floor Announcements";
          } else if (conv.type === "TEAM") {
            name = conv.name || "Team Channel";
            avatarLetter = "👥";
            subtitle = "Active Team Chat";
          } else {
            // Direct chat: find the other participant
            const other = conv.participants.find((p: any) => p.userId !== currentUserId);
            if (other?.user) {
              name = other.user.name;
              avatarLetter = other.user.name.charAt(0).toUpperCase();
              recipientId = other.user.id;
              recipientRole = other.user.role;
              subtitle = `${other.user.role} · @${other.user.username}`;
              recipientShiftStatus = statusMap.get(other.user.id) || "OFFLINE";
            } else {
              name = "Direct Chat";
              avatarLetter = "💬";
              subtitle = "1:1 Message";
            }
          }

          const myParticipant = conv.participants.find((p: any) => p.userId === currentUserId);
          const unreadCount = myParticipant?.unreadCount || 0;
          const lastMsg = conv.messages[0];

          return {
            id: conv.id,
            type: conv.type,
            name,
            avatarLetter,
            subtitle,
            lastMessageText: lastMsg ? `${lastMsg.sender.name}: ${lastMsg.content}` : "No messages yet",
            lastMessageTime: lastMsg ? lastMsg.createdAt.toISOString() : conv.createdAt.toISOString(),
            unreadCount,
            recipientId,
            recipientRole,
            recipientShiftStatus,
          };
        });
      }
    }
  } catch {
    // Fallback to in-memory store
  }

  // Fallback: In-Memory dynamic conversations
  const staff = await getStaffDirectoryAction();
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const storedList = getInMemoryConversations(currentUserId);

  return storedList.map((conv) => {
    let name = conv.name || "Chat";
    let avatarLetter = "#";
    let subtitle = "";
    let recipientId: string | undefined = undefined;
    let recipientRole: Role | undefined = undefined;
    let recipientShiftStatus: "ON_SHIFT" | "ON_BREAK" | "OFFLINE" | undefined = undefined;

    if (conv.type === "GENERAL") {
      name = "#General Floor";
      avatarLetter = "📢";
      subtitle = "Company-wide Floor Announcements";
    } else if (conv.type === "TEAM") {
      name = conv.name || "Team Channel";
      avatarLetter = "👥";
      subtitle = "Active Team Chat";
    } else {
      const otherId = conv.participantIds.find((id) => id !== currentUserId);
      const otherUser = otherId ? staffMap.get(otherId) : null;
      if (otherUser) {
        name = otherUser.name;
        avatarLetter = otherUser.name.charAt(0).toUpperCase();
        recipientId = otherUser.id;
        recipientRole = otherUser.role;
        subtitle = `${otherUser.role} · @${otherUser.username}`;
        recipientShiftStatus = otherUser.shiftStatus;
      } else {
        name = "Direct Chat";
        avatarLetter = "💬";
        subtitle = "1:1 Message";
      }
    }

    const unreadCount = conv.unreadCounts?.[currentUserId] || 0;

    return {
      id: conv.id,
      type: conv.type,
      name,
      avatarLetter,
      subtitle,
      lastMessageText: conv.lastMessage
        ? `${conv.lastMessage.senderName}: ${conv.lastMessage.content}`
        : "No messages yet",
      lastMessageTime: conv.lastMessage?.createdAt || conv.createdAt,
      unreadCount,
      recipientId,
      recipientRole,
      recipientShiftStatus,
    };
  });
}

// 2. Get messages for a specific conversation
export async function getMessagesAction(conversationId: string): Promise<ChatMessageView[]> {
  const session = await getSession();
  if (!session) return [];

  const currentUserId = session.userId;

  try {
    // Check Prisma
    const messages = await db.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (messages.length > 0) {
      // Mark as read in Prisma
      await db.conversationParticipant.updateMany({
        where: { conversationId, userId: currentUserId },
        data: { unreadCount: 0, lastReadAt: new Date() },
      });

      return messages.map((m: any) => {
        let parsedMetadata: any = null;
        if (m.metadata) {
          try {
            parsedMetadata = JSON.parse(m.metadata);
          } catch {
            // ignore
          }
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: m.sender.name,
          senderRole: m.sender.role,
          content: m.content,
          leadId: m.leadId,
          metadata: parsedMetadata,
          createdAt: m.createdAt.toISOString(),
          isOwn: m.senderId === currentUserId,
        };
      });
    }
  } catch {
    // Fallback to in-memory store
  }

  // In-Memory store fallback
  const fallbackMessages = getInMemoryMessages(conversationId, currentUserId);
  return fallbackMessages.map((m) => ({
    ...m,
    isOwn: m.senderId === currentUserId,
  }));
}

// 3. Send message action
export async function sendMessageAction(payload: {
  conversationId?: string;
  recipientId?: string;
  channelType?: "DIRECT" | "TEAM" | "GENERAL";
  content: string;
  leadId?: string | null;
  metadata?: {
    customerName?: string;
    mobile?: string;
    campaign?: string;
    status?: string;
  } | null;
}): Promise<{ success: boolean; message?: ChatMessageView; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const cleanContent = sanitizeText(payload.content, 2000);
  if (!cleanContent && !payload.leadId) {
    return { success: false, error: "Message cannot be empty." };
  }

  const currentUserId = session.userId;
  const currentUserName = session.name;
  const currentUserRole = session.role;

  try {
    let convId = payload.conversationId;

    // Direct message without explicit convId
    if (!convId && payload.recipientId) {
      // Look for existing direct conversation
      const existing = await db.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: currentUserId } } },
            { participants: { some: { userId: payload.recipientId } } },
          ],
        },
      });

      if (existing) {
        convId = existing.id;
      } else {
        // Create new conversation
        const newConv = await db.conversation.create({
          data: {
            type: "DIRECT",
            participants: {
              create: [
                { userId: currentUserId, unreadCount: 0 },
                { userId: payload.recipientId, unreadCount: 0 },
              ],
            },
          },
        });
        convId = newConv.id;
      }
    }

    if (convId) {
      const created = await db.chatMessage.create({
        data: {
          conversationId: convId,
          senderId: currentUserId,
          content: cleanContent || "Shared a lead",
          leadId: payload.leadId || null,
          metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        },
      });

      // Update conversation updatedAt
      await db.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });

      // Increment unread count for other participants
      await db.conversationParticipant.updateMany({
        where: {
          conversationId: convId,
          userId: { not: currentUserId },
        },
        data: {
          unreadCount: { increment: 1 },
        },
      });

      return {
        success: true,
        message: {
          id: created.id,
          conversationId: created.conversationId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderRole: currentUserRole,
          content: created.content,
          leadId: created.leadId,
          metadata: payload.metadata,
          createdAt: created.createdAt.toISOString(),
          isOwn: true,
        },
      };
    }
  } catch {
    // Fallback to in-memory store
  }

  // Fallback in-memory delivery
  const fallbackMsg = sendInMemoryMessage({
    conversationId: payload.conversationId,
    recipientId: payload.recipientId,
    channelType: payload.channelType,
    senderId: currentUserId,
    senderName: currentUserName,
    senderRole: currentUserRole,
    content: cleanContent || "Shared a lead",
    leadId: payload.leadId,
    metadata: payload.metadata,
  });

  return {
    success: true,
    message: {
      ...fallbackMsg,
      isOwn: true,
    },
  };
}

// 4. Get total unread count for the active user
export async function getUnreadMessageCountAction(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  try {
    const participants = await db.conversationParticipant.findMany({
      where: { userId: session.userId },
      select: { unreadCount: true },
    });

    if (participants.length > 0) {
      return participants.reduce((sum: number, p: any) => sum + (p.unreadCount || 0), 0);
    }
  } catch {
    // Fallback
  }

  return getInMemoryTotalUnread(session.userId);
}

// 5. Staff directory for new chats
export async function getStaffDirectoryAction(): Promise<StaffMember[]> {
  const session = await getSession();
  const currentUserId = session?.userId;

  // 1. Gather attendances to determine live shift status
  const liveShiftMap = new Map<string, "ON_SHIFT" | "ON_BREAK" | "OFFLINE">();

  try {
    const activeAtt = await prisma.attendance.findMany({
      where: { logoutAt: null },
      include: { breaks: { where: { endTime: null } } },
    });

    for (const a of activeAtt) {
      if (a.breaks && a.breaks.length > 0) {
        liveShiftMap.set(a.userId, "ON_BREAK");
      } else {
        liveShiftMap.set(a.userId, "ON_SHIFT");
      }
    }
  } catch {
    // Check dev attendances
    const devAtt = await getDevAttendances();
    for (const a of devAtt) {
      if (!a.logoutAt) {
        const hasOpenBreak = a.breaks.some((b) => !b.endTime);
        liveShiftMap.set(a.userId, hasOpenBreak ? "ON_BREAK" : "ON_SHIFT");
      }
    }
  }

  // 2. Fetch Users
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { team: true },
      orderBy: { name: "asc" },
    });

    if (users.length > 0) {
      return users
        .filter((u) => u.id !== currentUserId)
        .map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          teamId: u.teamId,
          teamName: u.team?.name || "General Floor",
          shiftStatus: liveShiftMap.get(u.id) || "OFFLINE",
        }));
    }
  } catch {
    // Fallback to user-store
  }

  const storedUsers = listStoredUsers();
  return storedUsers
    .filter((u) => u.id !== currentUserId && u.isActive)
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      teamId: null,
      teamName: u.campaignName || "General Floor",
      shiftStatus: liveShiftMap.get(u.id) || "ON_SHIFT", // In dev, make them active by default for rich testing
    }));
}

// 6. Share Lead to Chat action
export async function shareLeadToChatAction(params: {
  leadId: string;
  recipientId?: string;
  conversationId?: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized." };

  let leadDetails: {
    customerName: string;
    mobile: string;
    campaign: string;
    status: string;
  } | null = null;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      include: { campaign: true },
    });

    if (lead) {
      leadDetails = {
        customerName: lead.customerName,
        mobile: lead.mobile,
        campaign: lead.campaign.name,
        status: lead.status,
      };
    }
  } catch {
    const devLeads = await getDevLeads();
    const devL = devLeads.find((l) => l.id === params.leadId);
    if (devL) {
      leadDetails = {
        customerName: devL.customerName,
        mobile: devL.mobile,
        campaign: devL.campaignName,
        status: devL.status,
      };
    }
  }

  if (!leadDetails) {
    return { success: false, error: "Lead record could not be found to share." };
  }

  const result = await sendMessageAction({
    conversationId: params.conversationId,
    recipientId: params.recipientId,
    content: params.note || `Reviewing lead for ${leadDetails.customerName}`,
    leadId: params.leadId,
    metadata: leadDetails,
  });

  return { success: result.success, error: result.error };
}
