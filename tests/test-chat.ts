// Automated Verification Test for Genesoft Pulse Chat
import {
  getInMemoryConversations,
  getInMemoryMessages,
  sendInMemoryMessage,
  getInMemoryTotalUnread,
} from "../src/lib/chat-store";
import { Role } from "@prisma/client";

async function runChatTests() {
  console.log("==========================================");
  console.log("🧪 STARTING PULSE CHAT ENGINE TESTS");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  };

  // 1. Check Initial Conversations for Agent Sarah
  const sarahConvs = getInMemoryConversations("agent-sarah-uuid");
  assert(sarahConvs.length >= 2, "Agent Sarah has seeded conversations (General Floor, Direct Chats)");

  const generalConv = sarahConvs.find((c) => c.type === "GENERAL");
  assert(!!generalConv, "#General Floor conversation exists");

  // 2. Test Sending Direct Message from Closer Alex to Agent Sarah
  const sentMsg = sendInMemoryMessage({
    recipientId: "agent-sarah-uuid",
    senderId: "closer-alex-uuid",
    senderName: "Alex Morgan",
    senderRole: "CLOSER" as Role,
    content: "Customer approved the proposal! Ready for closing review.",
    leadId: "lead-12345",
    metadata: {
      customerName: "Robert Johnson",
      mobile: "3125550198",
      campaign: "USA Health Advantage",
      status: "APPROVED",
    },
  });

  assert(!!sentMsg.id, "Direct message successfully created with unique ID");
  assert(sentMsg.leadId === "lead-12345", "Attached leadId preserved in message");
  assert(sentMsg.metadata?.customerName === "Robert Johnson", "Attached lead metadata preserved");

  // 3. Test Unread Count increments for Agent Sarah
  const sarahUnread = getInMemoryTotalUnread("agent-sarah-uuid");
  assert(sarahUnread >= 1, `Agent Sarah unread count updated (current unread: ${sarahUnread})`);

  // 4. Test Reading Messages & Auto-mark as read
  const convId = sentMsg.conversationId;
  const messages = getInMemoryMessages(convId, "agent-sarah-uuid");
  assert(messages.length >= 1, `Retrieved ${messages.length} messages for conversation`);
  assert(messages[messages.length - 1].content.includes("approved the proposal"), "Latest message matches sent content");

  // 5. Test Unread Count decrements after reading
  const sarahUnreadAfter = getInMemoryTotalUnread("agent-sarah-uuid");
  assert(sarahUnreadAfter < sarahUnread, `Unread count marked as 0 after viewing (after: ${sarahUnreadAfter})`);

  // 6. Test Broadcasting to #General Floor
  const broadcastMsg = sendInMemoryMessage({
    conversationId: "conv-general-floor",
    senderId: "admin-system-uuid",
    senderName: "Genesoft Administrator",
    senderRole: "ADMIN" as Role,
    content: "📢 Shift Bonus Alert: Double incentive credited for all approved leads in the next 2 hours!",
  });

  assert(!!broadcastMsg.id, "Floor broadcast message successfully dispatched");
  const generalMessages = getInMemoryMessages("conv-general-floor", "agent-sarah-uuid");
  assert(
    generalMessages.some((m) => m.content.includes("Shift Bonus Alert")),
    "Broadcast message visible in #General Floor feed"
  );

  console.log("==========================================");
  console.log(`🎉 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runChatTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
