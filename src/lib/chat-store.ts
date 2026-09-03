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

// Seed Initial conversations (clean floor room only, zero mock messages)
function initializeSeedData() {
  if (inMemoryConversations.size > 0) return;

  const now = new Date().toISOString();

  // 1. General Floor Chat room (clean without dummy messages)
  inMemoryConversations.set("conv-general-floor", {
    id: "conv-general-floor",
    type: "GENERAL",
    name: "#General Floor Chat",
    teamId: null,
    participantIds: [],
    unreadCounts: {},
    lastReadAt: {},
    createdAt: now,
    updatedAt: now,
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
