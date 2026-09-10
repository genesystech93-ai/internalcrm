"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitizeText, sanitizeLongText } from "@/lib/sanitize";
import { Role } from "@prisma/client";
import { listStoredUsers } from "@/lib/user-store";
import {
  getInMemoryConversations,
  getInMemoryMessages,
  sendInMemoryMessage,
  getInMemoryTotalUnread,
  deleteInMemoryMessage,
  clearInMemoryConversationMessages,
  deleteInMemoryConversation,
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
  isSupervisorView?: boolean;
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
    leadId?: string;
    customerName?: string;
    mobile?: string;
    campaign?: string;
    status?: string;
    caseDetails?: string;
  } | null;
  createdAt: string;
  isOwn: boolean;
}

// 1. Get all conversations for current user (or ALL floor conversations if ADMIN)
export async function getConversationsAction(): Promise<ConversationView[]> {
  const session = await getSession();
  if (!session) return [];

  const currentUserId = session.userId;
  const isAdmin = session.role === "ADMIN";

  // Try Prisma first
  try {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { team: true },
    });

    if (user) {
      // Ensure #General Floor channel exists
      let generalConv = await db.conversation.findFirst({
        where: { type: "GENERAL" },
      });
      if (!generalConv) {
        generalConv = await db.conversation.create({
          data: {
            type: "GENERAL",
            name: "General Floor",
          },
        });
      }

      // Find conversations: If Admin, see EVERYTHING across the floor. Otherwise user's own.
      const whereCondition = isAdmin
        ? {}
        : {
            OR: [
              { participants: { some: { userId: currentUserId } } },
              { type: "GENERAL" },
              user.teamId ? { type: "TEAM", teamId: user.teamId } : {},
            ],
          };

      const conversations = await db.conversation.findMany({
        where: whereCondition,
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
          let isSupervisorView = false;

          if (conv.type === "GENERAL") {
            name = "#General Floor";
            avatarLetter = "📢";
            subtitle = "Company-wide Floor Announcements";
          } else if (conv.type === "TEAM") {
            name = conv.name || "Team Channel";
            avatarLetter = "👥";
            subtitle = "Active Team Channel";
          } else {
            // Check if current user is participant
            const isUserParticipant = conv.participants.some((p: any) => p.userId === currentUserId);

            if (isUserParticipant) {
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
            } else if (isAdmin) {
              // Admin supervisor view of floor chat between two other staff members
              isSupervisorView = true;
              const p1 = conv.participants[0]?.user;
              const p2 = conv.participants[1]?.user;
              if (p1 && p2) {
                name = `[Audit] ${p1.name} ↔ ${p2.name}`;
                avatarLetter = "A";
                subtitle = `Floor Monitor · ${p1.role} & ${p2.role}`;
              } else if (p1) {
                name = `[Audit] ${p1.name} (Direct)`;
                avatarLetter = "A";
                subtitle = `Floor Monitor · ${p1.role}`;
              } else {
                name = "Floor Direct Chat";
                avatarLetter = "A";
                subtitle = "Floor Monitor";
              }
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
            isSupervisorView,
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
  const storedList = getInMemoryConversations(currentUserId, isAdmin);

  return storedList.map((conv) => {
    let name = conv.name || "Chat";
    let avatarLetter = "#";
    let subtitle = "";
    let recipientId: string | undefined = undefined;
    let recipientRole: Role | undefined = undefined;
    let recipientShiftStatus: "ON_SHIFT" | "ON_BREAK" | "OFFLINE" | undefined = undefined;
    let isSupervisorView = false;

    if (conv.type === "GENERAL") {
      name = "#General Floor";
      avatarLetter = "📢";
      subtitle = "Company-wide Floor Announcements";
    } else if (conv.type === "TEAM") {
      name = conv.name || "Team Channel";
      avatarLetter = "👥";
      subtitle = "Active Team Channel";
    } else {
      const isUserParticipant = conv.participantIds.includes(currentUserId);
      if (isUserParticipant) {
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
      } else if (isAdmin) {
        isSupervisorView = true;
        const u1 = staffMap.get(conv.participantIds[0]);
        const u2 = staffMap.get(conv.participantIds[1]);
        if (u1 && u2) {
          name = `[Audit] ${u1.name} ↔ ${u2.name}`;
          avatarLetter = "A";
          subtitle = `Floor Monitor · ${u1.role} & ${u2.role}`;
        } else if (u1) {
          name = `[Audit] ${u1.name} (Direct)`;
          avatarLetter = "A";
          subtitle = `Floor Monitor · ${u1.role}`;
        } else {
          name = "Floor Direct Chat";
          avatarLetter = "A";
          subtitle = "Floor Monitor";
        }
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
      isSupervisorView,
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

        if (parsedMetadata && m.leadId && !parsedMetadata.leadId) {
          parsedMetadata.leadId = m.leadId;
        } else if (!parsedMetadata && m.leadId) {
          parsedMetadata = { leadId: m.leadId };
        }

        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: m.sender?.name || "User",
          senderRole: m.sender?.role || "AGENT",
          content: m.content,
          leadId: m.leadId,
          metadata: parsedMetadata,
          createdAt: m.createdAt.toISOString(),
          isOwn: m.senderId === currentUserId,
        };
      });
    }

    // If 0 messages, verify if conversation exists in Prisma
    const convExists = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (convExists) {
      return [];
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
    leadId?: string;
    customerName?: string;
    mobile?: string;
    campaign?: string;
    status?: string;
    caseDetails?: string;
  } | null;
}): Promise<{ success: boolean; message?: ChatMessageView; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Preserve case facts and lead details without character limit truncation
  const hasCaseOrLead = Boolean(payload.leadId || payload.metadata?.caseDetails);
  const cleanContent = hasCaseOrLead
    ? sanitizeLongText(payload.content)
    : sanitizeText(payload.content, 4000);

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
    } else if (!convId && !payload.recipientId) {
      // Default to General Floor channel
      let general = await db.conversation.findFirst({
        where: { type: "GENERAL" },
      });
      if (!general) {
        general = await db.conversation.create({
          data: {
            type: "GENERAL",
            name: "General Floor",
          },
        });
      }
      convId = general.id;
    }

    if (convId) {
      // Ensure sender is a participant if not already (e.g. Admin intervening or joining floor thread)
      const existingParticipant = await db.conversationParticipant.findFirst({
        where: { conversationId: convId, userId: currentUserId },
      });
      if (!existingParticipant) {
        await db.conversationParticipant.create({
          data: {
            conversationId: convId,
            userId: currentUserId,
            unreadCount: 0,
          },
        });
      }

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
      shiftStatus: liveShiftMap.get(u.id) || "OFFLINE",
    }));
}

// 6. Share Lead to Chat action
export async function shareLeadToChatAction(params: {
  leadId: string;
  targetType?: "GENERAL" | "ADMIN" | "AGENT";
  recipientId?: string;
  conversationId?: string;
  note?: string;
  caseDetails?: string;
}): Promise<{ success: boolean; conversationId?: string; messageId?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized." };

  let leadDetails: {
    leadId: string;
    customerName: string;
    mobile: string;
    campaign: string;
    status: string;
    caseDetails?: string;
  } | null = null;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      include: { campaign: true },
    });

    if (lead) {
      leadDetails = {
        leadId: lead.id,
        customerName: lead.customerName || "Lead",
        mobile: lead.mobile || "",
        campaign: lead.campaign?.name || "General Campaign",
        status: lead.status || "PENDING",
        caseDetails: (lead as any).caseDetails || params.caseDetails || lead.notes || undefined,
      };
    }
  } catch (err) {
    console.error("Failed to query lead for sharing:", err);
  }

  if (!leadDetails) {
    try {
      const devLeads = await getDevLeads();
      const devL = devLeads.find((l) => l.id === params.leadId);
      if (devL) {
        leadDetails = {
          leadId: devL.id,
          customerName: devL.customerName || "Lead",
          mobile: devL.mobile || "",
          campaign: devL.campaignName || "General Campaign",
          status: devL.status || "PENDING",
          caseDetails: devL.caseDetails || params.caseDetails || devL.notes || undefined,
        };
      }
    } catch {
      // Dev mode fallback
    }
  }

  if (!leadDetails) {
    return { success: false, error: "Lead record could not be found to share." };
  }

  // Routing destination resolution
  let convId = params.conversationId;
  let targetRecipientId = params.recipientId;

  if (params.targetType === "ADMIN" && !targetRecipientId) {
    // Auto-resolve active admin for 1:1 direct chat dispatch
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });
      if (adminUser) {
        targetRecipientId = adminUser.id;
      }
    } catch {
      // fallback
    }

    if (!targetRecipientId) {
      const stored = listStoredUsers();
      const admin = stored.find((u) => u.role === "ADMIN" && u.isActive);
      if (admin) targetRecipientId = admin.id;
    }
  } else if (params.targetType === "GENERAL") {
    // Explicit general floor room
    targetRecipientId = undefined;
    convId = undefined;
  }

  let formattedContent = params.note ? `${params.note}\n\n` : "";
  formattedContent += `📋 [Floor Lead Share]\nCustomer: ${leadDetails.customerName}\nPhone: ${leadDetails.mobile}\nCampaign: ${leadDetails.campaign}\nStatus: ${leadDetails.status}`;
  if (leadDetails.caseDetails) {
    formattedContent += `\n\n📂 Case Details:\n${leadDetails.caseDetails}`;
  }

  const result = await sendMessageAction({
    conversationId: convId,
    recipientId: targetRecipientId,
    channelType: params.targetType === "GENERAL" ? "GENERAL" : undefined,
    content: formattedContent,
    leadId: params.leadId,
    metadata: leadDetails,
  });

  return {
    success: result.success,
    conversationId: result.message?.conversationId,
    messageId: result.message?.id,
    error: result.error,
  };
}

export interface RecentLeadForChat {
  id: string;
  customerName: string;
  mobile: string;
  campaignName: string;
  status: string;
}

// 7. Get Recent Leads for Chat Attachment
export async function getRecentLeadsForChatAction(): Promise<RecentLeadForChat[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const leads = await prisma.lead.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: { campaign: { select: { name: true } } },
    });

    if (leads.length > 0) {
      return leads.map((l: any) => ({
        id: l.id,
        customerName: l.customerName,
        mobile: l.mobile,
        campaignName: l.campaign?.name || "General Campaign",
        status: l.status,
      }));
    }
  } catch {
    // Fallback to dev leads
  }

  const devLeads = await getDevLeads();
  return devLeads.slice(0, 20).map((l) => ({
    id: l.id,
    customerName: l.customerName,
    mobile: l.mobile,
    campaignName: l.campaignName || "General Campaign",
    status: l.status,
  }));
}

// 8. Get current user chat identity
export async function getCurrentUserChatInfoAction(): Promise<{
  userId: string;
  name: string;
  username: string;
  role: Role;
} | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    userId: session.userId,
    name: session.name,
    username: session.username,
    role: session.role,
  };
}

// 9. Delete an individual chat message (Sender or Admin moderation)
export async function deleteMessageAction(messageId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const currentUserId = session.userId;
  const isAdmin = session.role === "ADMIN";

  try {
    const existingMsg = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true, senderId: true },
    });

    if (existingMsg) {
      // Permission check: Admins can delete any message (moderation), regular users can only delete their own
      if (!isAdmin && existingMsg.senderId !== currentUserId) {
        return {
          success: false,
          error: "Permission denied: You can only delete your own messages.",
        };
      }

      await db.chatMessage.delete({
        where: { id: messageId },
      });

      // Touch conversation updatedAt
      await db.conversation.update({
        where: { id: existingMsg.conversationId },
        data: { updatedAt: new Date() },
      }).catch(() => {});

      deleteInMemoryMessage(messageId);
      return { success: true };
    }
  } catch {
    // Fallback to in-memory store
  }

  // Fallback in-memory deletion
  const inMemorySuccess = deleteInMemoryMessage(messageId);
  return { success: inMemorySuccess };
}

// 10. Clear all messages in a conversation (wipes history while preserving the thread)
export async function clearConversationMessagesAction(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const currentUserId = session.userId;
  const isAdmin = session.role === "ADMIN";

  try {
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (conv) {
      // If General Floor channel, only ADMIN can clear it
      if (conv.type === "GENERAL" && !isAdmin) {
        return {
          success: false,
          error: "Only floor administrators can clear the General Floor channel.",
        };
      }

      // If direct or team chat, must be participant or admin
      if (!isAdmin) {
        const isParticipant = conv.participants.some(
          (p: any) => p.userId === currentUserId
        );
        if (!isParticipant) {
          return {
            success: false,
            error: "Unauthorized: You are not a participant in this conversation.",
          };
        }
      }

      await db.chatMessage.deleteMany({
        where: { conversationId },
      });

      await db.conversationParticipant.updateMany({
        where: { conversationId },
        data: { unreadCount: 0 },
      });

      await db.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      clearInMemoryConversationMessages(conversationId);
      return { success: true };
    }
  } catch {
    // Fallback to in-memory store
  }

  const inMemoryCleared = clearInMemoryConversationMessages(conversationId);
  return { success: inMemoryCleared };
}

// 11. Delete an entire conversation (wipes thread, participants, and all messages)
export async function deleteConversationAction(conversationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const currentUserId = session.userId;
  const isAdmin = session.role === "ADMIN";

  try {
    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (conv) {
      // General floor channel cannot be permanently deleted
      if (conv.type === "GENERAL") {
        return {
          success: false,
          error: "The General Floor channel cannot be deleted. You can clear its messages instead.",
        };
      }

      // Permission check: Admins can delete any thread; agents can only delete direct/team threads they are part of
      if (!isAdmin) {
        const isParticipant = conv.participants.some(
          (p: any) => p.userId === currentUserId
        );
        if (!isParticipant) {
          return {
            success: false,
            error: "Unauthorized: You are not authorized to delete this conversation.",
          };
        }
      }

      await db.conversation.delete({
        where: { id: conversationId },
      });

      deleteInMemoryConversation(conversationId);
      return { success: true };
    }
  } catch {
    // Fallback to in-memory store
  }

  const inMemoryDeleted = deleteInMemoryConversation(conversationId);
  return { success: inMemoryDeleted };
}


