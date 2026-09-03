import { Role } from "@prisma/client";

export interface StoredChatMessage {
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
}

export interface StoredConversation {
  id: string;
  type: "DIRECT" | "TEAM" | "GENERAL";
  name?: string;
  teamId?: string | null;
  participantIds: string[];
  unreadCounts: Record<string, number>; // userId -> unread count
  lastReadAt: Record<string, string>;   // userId -> timestamp
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  role: Role;
  teamId?: string | null;
  teamName?: string;
  shiftStatus: "ON_SHIFT" | "ON_BREAK" | "OFFLINE";
}

// In-Memory Conversations registry
const inMemoryConversations: Map<string, StoredConversation> = new Map();
const inMemoryMessages: StoredChatMessage[] = [];

// Seed Initial conversations & messages
function initializeSeedData() {
  if (inMemoryConversations.size > 0) return;

  const now = new Date();
  const timeMinusMins = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();

  // 1. General Floor Chat
  inMemoryConversations.set("conv-general-floor", {
    id: "conv-general-floor",
    type: "GENERAL",
    name: "#General Floor Chat",
    teamId: null,
    participantIds: ["admin-system-uuid", "agent-sarah-uuid", "closer-alex-uuid"],
    unreadCounts: {
      "agent-sarah-uuid": 0,
      "closer-alex-uuid": 0,
      "admin-system-uuid": 0,
    },
    lastReadAt: {},
    lastMessage: {
      content: "Floor Shift is officially active! 🎯 Target for today: 45 verified leads.",
      senderName: "Genesoft Administrator",
      createdAt: timeMinusMins(25),
    },
    createdAt: timeMinusMins(120),
    updatedAt: timeMinusMins(25),
  });

  inMemoryMessages.push({
    id: "msg-gen-1",
    conversationId: "conv-general-floor",
    senderId: "admin-system-uuid",
    senderName: "Genesoft Administrator",
    senderRole: "ADMIN" as Role,
    content: "Welcome team! Please make sure to log your shift before 7:15 PM to avoid LATE grace deductions.",
    createdAt: timeMinusMins(45),
  });

  inMemoryMessages.push({
    id: "msg-gen-2",
    conversationId: "conv-general-floor",
    senderId: "closer-alex-uuid",
    senderName: "Alex Morgan",
    senderRole: "CLOSER" as Role,
    content: "Ready on USA Health dialers. Send high-intent warm transfers my way!",
    createdAt: timeMinusMins(30),
  });

  inMemoryMessages.push({
    id: "msg-gen-3",
    conversationId: "conv-general-floor",
    senderId: "admin-system-uuid",
    senderName: "Genesoft Administrator",
    senderRole: "ADMIN" as Role,
    content: "Floor Shift is officially active! 🎯 Target for today: 45 verified leads.",
    createdAt: timeMinusMins(25),
  });

  // 2. Direct Conversation: Sarah (Agent) <-> Alex (Closer)
  inMemoryConversations.set("conv-sarah-alex", {
    id: "conv-sarah-alex",
    type: "DIRECT",
    participantIds: ["agent-sarah-uuid", "closer-alex-uuid"],
    unreadCounts: {
      "agent-sarah-uuid": 1,
      "closer-alex-uuid": 0,
    },
    lastReadAt: {},
    lastMessage: {
      content: "Just reviewed lead Robert Johnson. Ready for callback at 8:15 PM.",
      senderName: "Alex Morgan",
      createdAt: timeMinusMins(10),
    },
    createdAt: timeMinusMins(60),
    updatedAt: timeMinusMins(10),
  });

  inMemoryMessages.push({
    id: "msg-sa-1",
    conversationId: "conv-sarah-alex",
    senderId: "agent-sarah-uuid",
    senderName: "Sarah Connor",
    senderRole: "AGENT" as Role,
    content: "Hey Alex! Can you take a look at customer Robert Johnson? They have Medicare Part A & B verified.",
    leadId: "lead-sample-1",
    metadata: {
      customerName: "Robert Johnson",
      mobile: "3125550198",
      campaign: "USA Health Advantage",
      status: "UPLOADED",
    },
    createdAt: timeMinusMins(15),
  });

  inMemoryMessages.push({
    id: "msg-sa-2",
    conversationId: "conv-sarah-alex",
    senderId: "closer-alex-uuid",
    senderName: "Alex Morgan",
    senderRole: "CLOSER" as Role,
    content: "Just reviewed lead Robert Johnson. Ready for callback at 8:15 PM.",
    createdAt: timeMinusMins(10),
  });

  // 3. Direct Conversation: Sarah (Agent) <-> Admin
  inMemoryConversations.set("conv-sarah-admin", {
    id: "conv-sarah-admin",
    type: "DIRECT",
    participantIds: ["agent-sarah-uuid", "admin-system-uuid"],
    unreadCounts: {
      "agent-sarah-uuid": 0,
      "admin-system-uuid": 0,
    },
    lastReadAt: {},
    lastMessage: {
      content: "Your commission bonus for reaching Tier 2 milestone has been approved! Great work.",
      senderName: "Genesoft Administrator",
      createdAt: timeMinusMins(5),
    },
    createdAt: timeMinusMins(50),
    updatedAt: timeMinusMins(5),
  });

  inMemoryMessages.push({
    id: "msg-sadm-1",
    conversationId: "conv-sarah-admin",
    senderId: "admin-system-uuid",
    senderName: "Genesoft Administrator",
    senderRole: "ADMIN" as Role,
    content: "Your commission bonus for reaching Tier 2 milestone has been approved! Great work.",
    createdAt: timeMinusMins(5),
  });
}

// Initial setup
initializeSeedData();

// Exported Helper Methods for In-Memory Mode
export function getInMemoryConversations(userId: string) {
  initializeSeedData();
  const list: StoredConversation[] = [];

  for (const conv of inMemoryConversations.values()) {
    if (conv.type === "GENERAL" || conv.participantIds.includes(userId)) {
      list.push(conv);
    }
  }

  // Sort by latest message or updatedAt
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getInMemoryMessages(conversationId: string, userId: string) {
  initializeSeedData();
  // Mark unread as 0 for this user
  const conv = inMemoryConversations.get(conversationId);
  if (conv && conv.unreadCounts) {
    conv.unreadCounts[userId] = 0;
    conv.lastReadAt[userId] = new Date().toISOString();
  }

  return inMemoryMessages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendInMemoryMessage(params: {
  conversationId?: string;
  recipientId?: string;
  channelType?: "DIRECT" | "TEAM" | "GENERAL";
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
}) {
  initializeSeedData();
  const { senderId, senderName, senderRole, content, leadId, metadata } = params;
  let conversationId = params.conversationId;

  // If conversationId is not provided, look for existing direct conversation with recipientId
  if (!conversationId && params.recipientId) {
    for (const conv of inMemoryConversations.values()) {
      if (
        conv.type === "DIRECT" &&
        conv.participantIds.includes(senderId) &&
        conv.participantIds.includes(params.recipientId)
      ) {
        conversationId = conv.id;
        break;
      }
    }

    // Create new direct conversation if none exists
    if (!conversationId) {
      conversationId = `conv-${Date.now()}`;
      inMemoryConversations.set(conversationId, {
        id: conversationId,
        type: "DIRECT",
        participantIds: [senderId, params.recipientId],
        unreadCounts: {
          [senderId]: 0,
          [params.recipientId]: 0,
        },
        lastReadAt: {
          [senderId]: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (!conversationId) {
    conversationId = "conv-general-floor";
  }

  const conv = inMemoryConversations.get(conversationId);
  const now = new Date().toISOString();

  const newMsg: StoredChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId,
    senderId,
    senderName,
    senderRole,
    content,
    leadId: leadId || null,
    metadata: metadata || null,
    createdAt: now,
  };

  inMemoryMessages.push(newMsg);

  if (conv) {
    conv.updatedAt = now;
    conv.lastMessage = {
      content: leadId ? `📋 Shared Lead: ${metadata?.customerName || "Lead details"}` : content,
      senderName,
      createdAt: now,
    };

    // Increment unread count for other participants
    if (conv.type === "GENERAL") {
      // In general, increment for everyone except sender
      for (const pId of conv.participantIds) {
        if (pId !== senderId) {
          conv.unreadCounts[pId] = (conv.unreadCounts[pId] || 0) + 1;
        }
      }
    } else {
      for (const pId of conv.participantIds) {
        if (pId !== senderId) {
          conv.unreadCounts[pId] = (conv.unreadCounts[pId] || 0) + 1;
        }
      }
    }
  }

  return newMsg;
}

export function getInMemoryTotalUnread(userId: string): number {
  initializeSeedData();
  let count = 0;
  for (const conv of inMemoryConversations.values()) {
    if (conv.type === "GENERAL" || conv.participantIds.includes(userId)) {
      count += conv.unreadCounts?.[userId] || 0;
    }
  }
  return count;
}
