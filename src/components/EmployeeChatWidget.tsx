"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Search,
  Plus,
  ArrowLeft,
  Users,
  Radio,
  Clock,
  Sparkles,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  FileText,
  Settings,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Shield,
  Eye,
  PanelLeft,
  PanelLeftClose,
  Eraser,
  AlertTriangle,
} from "lucide-react";
import {
  getConversationsAction,
  getMessagesAction,
  sendMessageAction,
  getUnreadMessageCountAction,
  getStaffDirectoryAction,
  getRecentLeadsForChatAction,
  getCurrentUserChatInfoAction,
  deleteMessageAction,
  clearConversationMessagesAction,
  deleteConversationAction,
  ConversationView,
  ChatMessageView,
  RecentLeadForChat,
} from "@/app/actions/messages";
import { getLeadByIdAction, LeadItem } from "@/app/actions/leads";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { StaffMember } from "@/lib/chat-store";
import { Role, LeadStatus } from "@prisma/client";

// Default Canned Operational Quick Replies for Call Center Floor
const DEFAULT_QUICK_REPLIES = [
  "📞 Customer live on line - transferring now",
  "📋 Case intake completed - ready for closer review",
  "✅ Verified & approved for client submission",
  "⚠️ Customer requested callback at scheduled time",
  "🏥 Medical records & police report pending",
  "❓ Can you take this live transfer immediately?",
];

const QUICK_REPLIES_STORAGE_KEY = "crm_chat_quick_replies_v1";

// Synthesized gentle chime via Web Audio API (Zero external file dependencies)
function playGentleChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // AudioContext blocked or user interaction required
  }
}

export function EmployeeChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    name: string;
    username: string;
    role: Role;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"conversations" | "directory">("conversations");
  const [adminFilter, setAdminFilter] = useState<"ALL" | "DIRECT" | "TEAM" | "GENERAL">("ALL");

  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  // Lead Attachment State
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [recentLeads, setRecentLeads] = useState<RecentLeadForChat[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<RecentLeadForChat | null>(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // In-Thread Search State
  const [showInThreadSearch, setShowInThreadSearch] = useState(false);
  const [inThreadSearchQuery, setInThreadSearchQuery] = useState("");

  // Left Sidebar visibility state (defaults to true on desktop)
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Shared Lead Details Modal inspection state
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<LeadItem | null>(null);
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);

  // Transcript Copy State
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  // Deletion and Clear Conversation State
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<ConversationView | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Canned Quick Replies State
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [showQuickRepliesManager, setShowQuickRepliesManager] = useState(false);
  const [newQuickReplyText, setNewQuickReplyText] = useState("");
  const [editingReplyIndex, setEditingReplyIndex] = useState<number | null>(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevTotalUnreadRef = useRef(0);

  // Load user session & quick replies from storage on mount
  useEffect(() => {
    getCurrentUserChatInfoAction().then((u) => {
      if (u) setCurrentUser(u);
    });

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(QUICK_REPLIES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuickReplies(parsed);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Auto-dismiss action feedback notifications after 4.5 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Save quick replies to localStorage
  const saveQuickReplies = (updated: string[]) => {
    setQuickReplies(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(QUICK_REPLIES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleAddQuickReply = () => {
    if (!newQuickReplyText.trim()) return;
    const updated = [...quickReplies, newQuickReplyText.trim()];
    saveQuickReplies(updated);
    setNewQuickReplyText("");
  };

  const handleSaveEditQuickReply = (index: number) => {
    if (!editingReplyText.trim()) return;
    const updated = [...quickReplies];
    updated[index] = editingReplyText.trim();
    saveQuickReplies(updated);
    setEditingReplyIndex(null);
    setEditingReplyText("");
  };

  const handleDeleteQuickReply = (index: number) => {
    const updated = quickReplies.filter((_, i) => i !== index);
    saveQuickReplies(updated);
  };

  const handleResetQuickReplies = () => {
    saveQuickReplies(DEFAULT_QUICK_REPLIES);
  };

  // Toggle emoji reactions on messages
  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessageReactions((prev) => {
      const current = prev[messageId] || [];
      const hasReacted = current.includes(emoji);
      return {
        ...prev,
        [messageId]: hasReacted
          ? current.filter((e) => e !== emoji)
          : [...current, emoji],
      };
    });
  };

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load & unread check
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadMessageCountAction();
      if (count > prevTotalUnreadRef.current && soundEnabled && !isOpen) {
        playGentleChime();
      }
      prevTotalUnreadRef.current = count;
      setTotalUnread(count);
    } catch {
      // Ignore network errors
    }
  }, [soundEnabled, isOpen]);

  const loadConversations = useCallback(async () => {
    try {
      const list = await getConversationsAction();
      setConversations(list);
    } catch {
      // Ignore
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const list = await getMessagesAction(convId);
      setMessages(list);
    } catch {
      // Ignore
    }
  }, []);

  const loadStaffDirectory = useCallback(async () => {
    try {
      const staff = await getStaffDirectoryAction();
      setStaffDirectory(staff);
    } catch {
      // Ignore
    }
  }, []);

  const loadRecentLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const leads = await getRecentLeadsForChatAction();
      setRecentLeads(leads);
    } catch {
      // Ignore
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Polling loop
  useEffect(() => {
    fetchUnreadCount();
    loadConversations();

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;

      fetchUnreadCount();

      if (isOpen) {
        loadConversations();
        if (activeConversation) {
          loadMessages(activeConversation.id);
        }
      }
    }, isOpen ? 3500 : 10000);

    return () => clearInterval(interval);
  }, [isOpen, activeConversation, fetchUnreadCount, loadConversations, loadMessages]);

  // Listen for programmatic chat open (e.g. Share to Chat from Leads Kanban or Table)
  useEffect(() => {
    const handleOpenChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId?: string; leadId?: string }>;
      setIsOpen(true);
      const convList = await getConversationsAction();
      setConversations(convList);

      const targetId = customEvent.detail?.conversationId;
      if (targetId) {
        const targetConv = convList.find((c) => c.id === targetId);
        if (targetConv) {
          setActiveConversation(targetConv);
        } else if (convList.length > 0) {
          setActiveConversation(convList[0]);
        }
        await loadMessages(targetId);
      } else if (convList.length > 0 && !activeConversation) {
        setActiveConversation(convList[0]);
        await loadMessages(convList[0].id);
      }
      playGentleChime();
    };

    window.addEventListener("crm:open-chat", handleOpenChat);
    return () => window.removeEventListener("crm:open-chat", handleOpenChat);
  }, [loadMessages, activeConversation]);

  // Select conversation
  const handleSelectConversation = (conv: ConversationView) => {
    setActiveConversation(conv);
    loadMessages(conv.id);
    setShowInThreadSearch(false);
    setInThreadSearchQuery("");
    // Optimistically decrement unread
    setTotalUnread((prev) => Math.max(0, prev - conv.unreadCount));
    conv.unreadCount = 0;
  };

  // Start new direct chat with a staff member
  const handleStartDirectChat = async (colleague: StaffMember) => {
    const existing = conversations.find(
      (c) => c.type === "DIRECT" && c.recipientId === colleague.id
    );

    if (existing) {
      setActiveConversation(existing);
      loadMessages(existing.id);
      setActiveTab("conversations");
    } else {
      const tempConv: ConversationView = {
        id: `temp-${colleague.id}`,
        type: "DIRECT",
        name: colleague.name,
        avatarLetter: colleague.name.charAt(0).toUpperCase(),
        subtitle: `${colleague.role} · @${colleague.username}`,
        lastMessageText: "Start the conversation",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        recipientId: colleague.id,
        recipientRole: colleague.role,
        recipientShiftStatus: colleague.shiftStatus,
      };
      setActiveConversation(tempConv);
      setMessages([]);
      setActiveTab("conversations");
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputContent.trim() && !selectedLead) || isSending || !activeConversation) return;

    const textToSend = inputContent.trim();
    const leadToAttach = selectedLead;

    setInputContent("");
    setSelectedLead(null);
    setShowLeadPicker(false);
    setIsSending(true);

    try {
      const isTemp = activeConversation.id.startsWith("temp-");
      const res = await sendMessageAction({
        conversationId: isTemp ? undefined : activeConversation.id,
        recipientId: isTemp ? activeConversation.recipientId : undefined,
        channelType: activeConversation.type,
        content: textToSend || (leadToAttach ? `Shared lead: ${leadToAttach.customerName}` : ""),
        leadId: leadToAttach ? leadToAttach.id : null,
        metadata: leadToAttach
          ? {
              customerName: leadToAttach.customerName,
              mobile: leadToAttach.mobile,
              campaign: leadToAttach.campaignName,
              status: leadToAttach.status,
            }
          : null,
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        if (isTemp && res.message.conversationId) {
          const updatedConv = {
            ...activeConversation,
            id: res.message.conversationId,
          };
          setActiveConversation(updatedConv);
        }
        loadConversations();
        if (soundEnabled) playGentleChime();
      }
    } catch {
      // restore text on error
      setInputContent(textToSend);
      setSelectedLead(leadToAttach);
    } finally {
      setIsSending(false);
    }
  };

  // Copy chat transcript
  const handleCopyTranscript = () => {
    if (!activeConversation || messages.length === 0) return;
    const header = `=== CHAT TRANSCRIPT: ${activeConversation.name} ===\nExported: ${new Date().toLocaleString()}\n----------------------------------------\n\n`;
    const body = messages
      .map((m) => {
        const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        let text = `[${time}] ${m.senderName} (${m.senderRole}): ${m.content}`;
        if (m.metadata) {
          text += `\n   [ATTACHED LEAD] ${m.metadata.customerName || "Customer"} | Phone: ${m.metadata.mobile || "N/A"} | Campaign: ${m.metadata.campaign || "N/A"} | Status: ${m.metadata.status || "N/A"}`;
        }
        return text;
      })
      .join("\n\n");

    navigator.clipboard.writeText(header + body);
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2500);
  };

  // Delete individual chat message
  const handleDeleteMessage = async (messageId: string) => {
    if (deletingMessageId) return;
    setDeletingMessageId(messageId);
    setActionFeedback(null);
    const prev = messages;
    setMessages((m) => m.filter((item) => item.id !== messageId));

    try {
      const res = await deleteMessageAction(messageId);
      if (!res.success) {
        setMessages(prev);
        setActionFeedback({ type: "error", text: res.error || "Failed to delete message." });
      } else {
        loadConversations();
      }
    } catch {
      setMessages(prev);
      setActionFeedback({ type: "error", text: "Network error deleting message." });
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Clear all messages inside the active conversation
  const handleClearConversation = async () => {
    if (!activeConversation || isClearing) return;
    setIsClearing(true);
    setActionFeedback(null);

    try {
      const res = await clearConversationMessagesAction(activeConversation.id);
      if (res.success) {
        setMessages([]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, lastMessageText: "No messages yet", unreadCount: 0 }
              : c
          )
        );
        setShowClearConfirm(false);
        setActionFeedback({ type: "success", text: "Conversation messages cleared." });
      } else {
        setActionFeedback({ type: "error", text: res.error || "Failed to clear conversation." });
      }
    } catch {
      setActionFeedback({ type: "error", text: "Failed to clear conversation messages." });
    } finally {
      setIsClearing(false);
    }
  };

  // Delete entire conversation thread
  const handleDeleteConversation = async (conv: ConversationView) => {
    if (isDeletingConv) return;
    setIsDeletingConv(true);
    setActionFeedback(null);

    try {
      const res = await deleteConversationAction(conv.id);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== conv.id));
        if (activeConversation?.id === conv.id) {
          setActiveConversation(null);
          setMessages([]);
        }
        setConversationToDelete(null);
        setActionFeedback({ type: "success", text: `Conversation "${conv.name}" deleted.` });
      } else {
        setActionFeedback({ type: "error", text: res.error || "Failed to delete conversation." });
      }
    } catch {
      setActionFeedback({ type: "error", text: "Failed to delete conversation." });
    } finally {
      setIsDeletingConv(false);
    }
  };

  // Inspect shared lead in full Lead Details Modal
  const handleOpenSharedLead = async (leadId?: string | null, metadata?: any) => {
    const targetLeadId = leadId || metadata?.leadId;
    if (!targetLeadId && !metadata) return;

    if (targetLeadId) {
      setLoadingLeadId(targetLeadId);
      try {
        const fullLead = await getLeadByIdAction(targetLeadId);
        if (fullLead) {
          setSelectedLeadForDetails(fullLead);
          setLoadingLeadId(null);
          return;
        }
      } catch (err) {
        console.error("Failed to load lead details from chat:", err);
      } finally {
        setLoadingLeadId(null);
      }
    }

    // Resilient fallback from chat metadata so clicking ALWAYS opens the modal
    if (metadata) {
      const fallbackLead: LeadItem = {
        id: targetLeadId || `shared-${Date.now()}`,
        customerName: metadata.customerName || "Floor Lead",
        dob: "1990-01-01",
        mobile: metadata.mobile || "N/A",
        address: "Contact Floor Agent for details",
        email: "floor.lead@internalcrm.local",
        campaignId: "",
        campaignName: metadata.campaign || "Floor Campaign",
        source: "REFERENCE",
        closerName: "Unassigned",
        status: (metadata.status as LeadStatus) || "PENDING_VERIFICATION",
        callBackTime: null,
        rejectionReason: null,
        agentId: "",
        agentName: "Floor Staff",
        agentUsername: "floor",
        notes: "Shared lead attachment from pulse chat.",
        caseDetails: metadata.caseDetails || null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
        history: [],
      };
      setSelectedLeadForDetails(fallbackLead);
    }
  };

  // Role pill styling
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "TL":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "CLOSER":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  // Presence status dot
  const getStatusDot = (status?: "ON_SHIFT" | "ON_BREAK" | "OFFLINE") => {
    switch (status) {
      case "ON_SHIFT":
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>On Shift</span>
          </span>
        );
      case "ON_BREAK":
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>On Break</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span>Offline</span>
          </span>
        );
    }
  };

  // Filtering conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (currentUser?.role === "ADMIN") {
      if (adminFilter === "DIRECT") return c.type === "DIRECT" && !c.isSupervisorView;
      if (adminFilter === "TEAM") return c.type === "TEAM";
      if (adminFilter === "GENERAL") return c.type === "GENERAL";
    }

    return true;
  });

  const filteredStaff = staffDirectory.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeads = recentLeads.filter(
    (l) =>
      l.customerName.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.mobile.includes(leadSearchQuery) ||
      l.campaignName.toLowerCase().includes(leadSearchQuery.toLowerCase())
  );

  const displayedMessages = inThreadSearchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(inThreadSearchQuery.toLowerCase()) ||
          m.senderName.toLowerCase().includes(inThreadSearchQuery.toLowerCase()) ||
          (m.metadata?.customerName &&
            m.metadata.customerName.toLowerCase().includes(inThreadSearchQuery.toLowerCase()))
      )
    : messages;

  return (
    <>
      {/* Floating Bottom-Right Launcher Widget */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              loadStaffDirectory();
              loadConversations();
            }}
            className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C] text-white shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer border border-white/20 backdrop-blur-md"
            aria-label="Open Employee Pulse Chat"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white animate-bounce-short" />
              {totalUnread > 0 && (
                <span className="absolute -top-2.5 -right-2.5 min-w-[20px] h-[20px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-pulse">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Pulse Chat</span>
                {currentUser?.role === "ADMIN" && (
                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-purple-200/40 text-white font-mono uppercase">
                    Admin
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
              </p>
              <p className="text-[10px] text-orange-100/90 font-medium">
                {totalUnread > 0
                  ? `${totalUnread} new message${totalUnread > 1 ? "s" : ""}`
                  : "Staff Floor Active"}
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Main Chat Window (Docked Workspace or Maximized Screen) */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            isMaximized
              ? "inset-2 sm:inset-6 sm:w-[94vw] sm:max-w-[1100px] sm:h-[88vh] sm:max-h-[850px] m-auto rounded-2xl sm:rounded-3xl"
              : "bottom-20 sm:bottom-6 right-2 sm:right-6 left-2 sm:left-auto w-[calc(100vw-1rem)] sm:w-[760px] md:w-[820px] lg:w-[860px] max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2.5rem)] h-[82vh] sm:h-[660px] max-h-[calc(100dvh-5.5rem)] sm:max-h-[86vh] rounded-2xl sm:rounded-3xl"
          }`}
        >
          {/* Top Bar / Global Header */}
          <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 h-14">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {/* Left Bar Toggle (Always available to collapse/expand sidebar) */}
              <button
                type="button"
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                  showSidebar
                    ? "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:bg-orange-950/30 dark:text-orange-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-orange-500"
                }`}
                title={showSidebar ? "Hide Chats & Channels Sidebar" : "Show Chats & Channels Sidebar"}
              >
                {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
                <span className="text-[11px] hidden md:inline">
                  {showSidebar ? "Hide Sidebar" : "Chats"}
                </span>
              </button>

              {/* Mobile Back Button when activeConversation is selected on small screens */}
              {activeConversation && (
                <button
                  type="button"
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer min-[540px]:hidden flex items-center gap-1 text-xs font-bold shrink-0"
                  title="Back to conversations list"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Chats</span>
                </button>
              )}

              <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span>Live Pulse Chat</span>
                  {currentUser?.role === "ADMIN" && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[9px] font-bold border border-purple-500/20 flex items-center gap-1 shrink-0">
                      <Shield className="w-2.5 h-2.5" />
                      <span>Floor Supervisor</span>
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] sm:max-w-none">
                  {currentUser?.role === "ADMIN"
                    ? "Floor oversight & direct messaging"
                    : "Internal messaging & floor channels"}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Audio Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  soundEnabled
                    ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800"
                    : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={soundEnabled ? "Mute audio notifications" : "Enable sound"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title={isMaximized ? "Restore standard view" : "Maximize chat view"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Minimize to launcher */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors cursor-pointer flex items-center justify-center"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body: 2-Column Responsive Workspace */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* COLUMN 1: Conversations List / Staff Directory (Persistently visible alongside active chat) */}
            {showSidebar && (
              <div
                className={`flex flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/80 border-r border-slate-200/80 dark:border-slate-800 transition-all shrink-0 ${
                  activeConversation
                    ? "w-full min-[540px]:w-[260px] sm:w-[280px] md:w-[300px] min-[540px]:flex"
                    : "w-full min-[540px]:w-[260px] sm:w-[280px] md:w-[300px] flex"
                }`}
              >
                {/* Search & Navigation Tabs */}
                <div className="p-3 border-b border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search chats, staff, or roles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/80">
                    <button
                      onClick={() => setActiveTab("conversations")}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        activeTab === "conversations"
                          ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Chats ({conversations.length})
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("directory");
                        loadStaffDirectory();
                      }}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        activeTab === "directory"
                          ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Staff ({staffDirectory.length})</span>
                    </button>
                  </div>

                  {/* Admin Supervisor Filter Pills */}
                  {currentUser?.role === "ADMIN" && activeTab === "conversations" && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                      {[
                        { key: "ALL", label: "All Floor Chats" },
                        { key: "DIRECT", label: "My Direct" },
                        { key: "TEAM", label: "Teams" },
                        { key: "GENERAL", label: "Announce" },
                      ].map((pill) => (
                        <button
                          key={pill.key}
                          onClick={() => setAdminFilter(pill.key as any)}
                          className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                            adminFilter === pill.key
                              ? "bg-purple-600 text-white font-bold"
                              : "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 hover:bg-purple-100"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab Content: Conversations List */}
                {activeTab === "conversations" ? (
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        <MessageSquare className="w-8 h-8 text-orange-400 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          No conversations found
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Open Staff Directory to message any colleague on the floor.
                        </p>
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          role="button"
                          tabIndex={0}
                          className={`group/convitem w-full p-2.5 rounded-2xl text-left transition-all flex items-start gap-2.5 border cursor-pointer relative ${
                            activeConversation?.id === conv.id
                              ? "bg-orange-100/70 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 shadow-sm"
                              : conv.unreadCount > 0
                              ? "bg-orange-50/70 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-900/40"
                              : "bg-white dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-800 hover:border-orange-200 dark:hover:border-slate-700 hover:bg-orange-50/30"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div
                              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm ${
                                conv.type === "GENERAL"
                                  ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white"
                                  : conv.type === "TEAM"
                                  ? "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white"
                                  : conv.isSupervisorView
                                  ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
                                  : "bg-gradient-to-tr from-slate-700 to-slate-900 text-white dark:from-slate-600 dark:to-slate-800"
                              }`}
                            >
                              {conv.avatarLetter}
                            </div>
                            {conv.type === "DIRECT" && !conv.isSupervisorView && (
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                  conv.recipientShiftStatus === "ON_SHIFT"
                                    ? "bg-emerald-500"
                                    : conv.recipientShiftStatus === "ON_BREAK"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {conv.name}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <span className="text-[9px] text-slate-400 whitespace-nowrap font-mono">
                                  {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {conv.type !== "GENERAL" && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConversationToDelete(conv);
                                    }}
                                    className="opacity-0 group-hover/convitem:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                                    title="Delete conversation"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                              {conv.lastMessageText}
                            </p>

                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 truncate max-w-[170px]">
                                {conv.subtitle}
                              </span>
                              {conv.unreadCount > 0 && (
                                <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Tab Content: Staff Directory */
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Active Floor Staff ({filteredStaff.length})
                      </span>
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                        ● Live
                      </span>
                    </div>

                    {filteredStaff.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleStartDirectChat(person)}
                        className="w-full p-2 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800 hover:border-orange-300 dark:hover:border-slate-700 hover:bg-orange-50/30 transition-all flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                              {person.name.charAt(0)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                person.shiftStatus === "ON_SHIFT"
                                  ? "bg-emerald-500"
                                  : person.shiftStatus === "ON_BREAK"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {person.name}
                              </span>
                              <span
                                className={`text-[8px] font-bold px-1 rounded border ${getRoleBadge(
                                  person.role
                                )}`}
                              >
                                {person.role}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono">
                              @{person.username} · {person.teamName || "Floor"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {getStatusDot(person.shiftStatus)}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COLUMN 2: Active Chat Thread View */}
            {activeConversation ? (
              <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-slate-50/60 dark:bg-slate-950/60 relative">
                {/* Active Thread Toolbar (Search & Export Transcript) */}
                <div className="px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 h-11">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-[220px]">
                      {activeConversation.name}
                    </span>
                    {activeConversation.isSupervisorView && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0 inline-flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        <span>Supervisor Monitor Mode</span>
                      </span>
                    )}
                    {activeConversation.recipientRole && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${getRoleBadge(
                          activeConversation.recipientRole
                        )}`}
                      >
                        {activeConversation.recipientRole}
                      </span>
                    )}
                    <div className="shrink-0">{getStatusDot(activeConversation.recipientShiftStatus)}</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* In-Thread Search Toggle */}
                    <button
                      onClick={() => setShowInThreadSearch(!showInThreadSearch)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        showInThreadSearch
                          ? "bg-orange-100 text-orange-600 dark:bg-slate-800"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      title="Search messages in thread"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>

                    {/* Copy Chat Transcript */}
                    <button
                      onClick={handleCopyTranscript}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                      title="Copy full chat transcript"
                    >
                      {transcriptCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-bold hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] hidden sm:inline">Copy Log</span>
                        </>
                      )}
                    </button>

                    {/* Clear Conversation Messages */}
                    {(activeConversation.type !== "GENERAL" || currentUser?.role === "ADMIN") && (
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                        title={
                          activeConversation.type === "GENERAL"
                            ? "Clear General Floor messages (Admin Moderation)"
                            : "Clear conversation messages"
                        }
                      >
                        <Eraser className="w-3.5 h-3.5 text-slate-500 hover:text-orange-600" />
                        <span className="text-[10px] hidden sm:inline">Clear Chat</span>
                      </button>
                    )}

                    {/* Delete Entire Conversation */}
                    {activeConversation.type !== "GENERAL" && (
                      <button
                        type="button"
                        onClick={() => setConversationToDelete(activeConversation)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
                        <span className="text-[10px] hidden sm:inline">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Toast / Banner */}
                {actionFeedback && (
                  <div
                    className={`px-3.5 py-1.5 text-xs font-medium flex items-center justify-between border-b shrink-0 ${
                      actionFeedback.type === "error"
                        ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900"
                        : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                    }`}
                  >
                    <span>{actionFeedback.text}</span>
                    <button
                      type="button"
                      onClick={() => setActionFeedback(null)}
                      className="p-0.5 hover:opacity-75 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* In-Thread Search Input Bar */}
                {showInThreadSearch && (
                  <div className="px-3 py-1.5 bg-orange-50/80 dark:bg-slate-800/80 border-b border-orange-200/50 dark:border-slate-700 flex items-center gap-2 shrink-0 h-9">
                    <Search className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <input
                      type="text"
                      placeholder="Filter messages in this conversation..."
                      value={inThreadSearchQuery}
                      onChange={(e) => setInThreadSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    {inThreadSearchQuery && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {displayedMessages.length} match{displayedMessages.length !== 1 ? "es" : ""}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setShowInThreadSearch(false);
                        setInThreadSearchQuery("");
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Message Feed */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
                  {displayedMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Sparkles className="w-8 h-8 text-orange-400 mb-2 opacity-80" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {inThreadSearchQuery
                          ? "No messages match your search query."
                          : `Beginning of conversation with ${activeConversation.name}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Use the quick replies below or attach a lead for instant review!
                      </p>
                    </div>
                  ) : (
                    displayedMessages.map((msg) => {
                      const reactions = messageReactions[msg.id] || [];
                      return (
                        <div
                          key={msg.id}
                          className={`group relative flex flex-col ${
                            msg.isOwn ? "items-end" : "items-start"
                          } space-y-1`}
                        >
                          {!msg.isOwn && (
                            <div className="flex items-center gap-1.5 pl-1">
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                  msg.senderRole === "ADMIN"
                                    ? "bg-purple-600 text-white ring-2 ring-purple-500/40"
                                    : "bg-sky-500 text-white ring-2 ring-sky-500/40"
                                }`}
                              >
                                {msg.senderName.charAt(0)}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {msg.senderName}
                              </span>
                              <span
                                className={`text-[8px] font-bold px-1 rounded border ${getRoleBadge(
                                  msg.senderRole
                                )}`}
                              >
                                {msg.senderRole}
                              </span>
                            </div>
                          )}

                          <div className="relative group/bubble max-w-[85%] sm:max-w-[80%]">
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                                msg.isOwn
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-xs"
                                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs"
                              }`}
                            >
                              {/* Text Content */}
                              <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>

                              {/* Rich Clickable Lead Card if attached */}
                              {(msg.metadata || msg.leadId) && (
                                <div
                                  onClick={() => handleOpenSharedLead(msg.leadId, msg.metadata)}
                                  role="button"
                                  tabIndex={0}
                                  title="Click to view full lead details and intake profile"
                                  className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1.5 cursor-pointer transition-all duration-150 group/leadcard ${
                                    msg.isOwn
                                      ? "bg-orange-700/40 hover:bg-orange-700/60 border-orange-400/50 hover:border-orange-300 text-orange-50 shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-900/80 hover:bg-orange-50/60 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-500/50 text-slate-700 dark:text-slate-200 shadow-xs"
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="flex items-center gap-1.5 truncate">
                                      <FileText className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                      <span className="truncate">{msg.metadata?.customerName || "Lead Details"}</span>
                                    </span>
                                    <span className="flex items-center gap-1 shrink-0">
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30 font-bold">
                                        {msg.metadata?.status || "ACTIVE"}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-orange-500 opacity-70 group-hover/leadcard:opacity-100 group-hover/leadcard:translate-x-0.5 transition-all" />
                                    </span>
                                  </div>

                                  <div className="text-[10px] opacity-90 flex items-center justify-between font-mono">
                                    <span>📱 {msg.metadata?.mobile || "No phone"}</span>
                                    <span className="truncate max-w-[130px]">{msg.metadata?.campaign || "Floor Campaign"}</span>
                                  </div>

                                  {msg.metadata?.caseDetails && (
                                    <div className="p-1.5 rounded-lg bg-black/5 dark:bg-black/25 border border-black/5 text-[10px] text-left">
                                      <div className="font-bold flex items-center gap-1 text-orange-600 dark:text-orange-300">
                                        <FileText className="w-3 h-3 shrink-0" />
                                        <span>Case Facts:</span>
                                      </div>
                                      <p className="line-clamp-2 italic opacity-90 mt-0.5">{msg.metadata.caseDetails}</p>
                                    </div>
                                  )}

                                  <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[9px] font-medium text-orange-600 dark:text-orange-400">
                                    <span>Click to open full lead</span>
                                    {loadingLeadId === (msg.leadId || msg.metadata?.leadId) ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                                    ) : (
                                      <span className="group-hover/leadcard:underline font-bold">Open Lead & Case ↗</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Quick Reaction Bar on hover */}
                            <div
                              className={`absolute top-[-14px] ${
                                msg.isOwn ? "left-0" : "right-0"
                              } opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full px-2 py-0.5 shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs z-10 scale-90 origin-bottom`}
                            >
                              {["👍", "🔥", "👀", "❤️", "✅"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className="hover:scale-125 transition-transform p-0.5 cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}

                              {/* Single Message Delete (Sender or Admin Moderation) */}
                              {(msg.isOwn || currentUser?.role === "ADMIN") && (
                                <>
                                  <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMessage(msg.id);
                                    }}
                                    disabled={deletingMessageId === msg.id}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors cursor-pointer"
                                    title={msg.isOwn ? "Delete your message" : "Delete message (Admin Moderation)"}
                                  >
                                    {deletingMessageId === msg.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Active Reactions Pills */}
                          {reactions.length > 0 && (
                            <div className="flex items-center gap-1 px-1 mt-0.5 flex-wrap">
                              {Array.from(new Set(reactions)).map((emoji) => {
                                const count = reactions.filter((r) => r === emoji).length;
                                return (
                                  <span
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg.id, emoji)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                  >
                                    <span>{emoji}</span>
                                    {count > 1 && (
                                      <span className="font-bold text-[9px] text-slate-500">
                                        {count}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-[9px] text-slate-400 px-1">
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.isOwn && <CheckCheck className="w-3.5 h-3.5 text-sky-400" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Lead Attachment Preview Chip (if selected) */}
                {selectedLead && (
                  <div className="px-3 py-2 bg-orange-500/10 dark:bg-orange-950/30 border-t border-orange-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-xs text-orange-900 dark:text-orange-200 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold">{selectedLead.customerName}</span>
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-mono ml-2">
                          {selectedLead.mobile} · {selectedLead.campaignName}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLead(null)}
                      className="p-1 rounded-lg text-orange-600 hover:bg-orange-500/15 cursor-pointer transition-colors shrink-0 ml-2"
                      title="Remove lead attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Canned Operational Quick Replies Bar */}
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQuickRepliesManager(true)}
                    className="h-6 w-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-orange-600 hover:border-orange-400 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                    title="Manage Canned Quick Replies"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5 hidden sm:inline">
                    Quick:
                  </span>
                  {quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputContent((prev) => (prev ? `${prev} ${reply}` : reply));
                      }}
                      className="h-6 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50/50 transition-all cursor-pointer shadow-2xs flex items-center shrink-0"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {/* Message Input Bar & Lead Attachment Button */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-end gap-2 shrink-0 w-full min-w-0"
                >
                  {/* Attach Lead Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!showLeadPicker) loadRecentLeads();
                        setShowLeadPicker(!showLeadPicker);
                      }}
                      className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        showLeadPicker || selectedLead
                          ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-orange-500 hover:border-orange-300"
                      }`}
                      title="Attach lead from floor"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Popover Lead Picker */}
                    {showLeadPicker && (
                      <div className="absolute bottom-14 left-0 w-80 max-w-[calc(100vw-3rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 z-30 space-y-2.5">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-orange-500" />
                            <span>Attach Floor Lead</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowLeadPicker(false)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Filter by customer, phone, or campaign..."
                            value={leadSearchQuery}
                            onChange={(e) => setLeadSearchQuery(e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 border-none focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                          {isLoadingLeads ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-orange-500" />
                              <span>Loading leads...</span>
                            </div>
                          ) : filteredLeads.length === 0 ? (
                            <p className="p-3 text-center text-xs text-slate-400">
                              No recent leads found.
                            </p>
                          ) : (
                            filteredLeads.map((lead) => (
                              <button
                                key={lead.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowLeadPicker(false);
                                }}
                                className="w-full p-2 text-left rounded-xl hover:bg-orange-50 dark:hover:bg-slate-700/70 transition-colors cursor-pointer flex items-center justify-between group border border-transparent hover:border-orange-200 dark:hover:border-slate-600"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {lead.customerName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {lead.mobile} · {lead.campaignName}
                                  </p>
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 font-mono shrink-0">
                                  {lead.status}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input Field Wrapper */}
                  <div className="flex-1 min-w-0 relative flex items-center rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:bg-white dark:focus-within:bg-slate-800 px-3 py-1.5 transition-all min-h-[40px]">
                    <textarea
                      rows={1}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message ${activeConversation.name}... (Enter to send)`}
                      className="w-full bg-transparent border-none resize-none focus:outline-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed max-h-24 custom-scrollbar"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputContent.trim() && !selectedLead) || isSending}
                    className="h-10 w-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-orange-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Send message (Enter)"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Empty State when no chat is currently selected (shown alongside sidebar on >= 540px) */
              <div className="hidden min-[540px]:flex flex-1 min-w-0 flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-slate-950/40">
                <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 shadow-inner">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Select a conversation to start chatting
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {currentUser?.role === "ADMIN"
                    ? "Monitor all floor chats live, intervene in staff threads, or message colleagues directly."
                    : "Connect with closers, team leaders, or agents across all active campaigns."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Canned Quick Replies Manager Modal / Popover */}
      {showQuickRepliesManager && (
        <div className="fixed inset-0 z-60 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Canned Quick Replies
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Customize your one-click call center reply templates
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowQuickRepliesManager(false);
                  setEditingReplyIndex(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Current Quick Replies */}
            <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {quickReplies.map((reply, index) => (
                <div
                  key={index}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                >
                  {editingReplyIndex === index ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingReplyText}
                        onChange={(e) => setEditingReplyText(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-slate-700 border border-orange-500 focus:outline-none text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditQuickReply(index)}
                        className="px-2 py-1 text-xs rounded-xl bg-orange-500 text-white font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingReplyIndex(null)}
                        className="px-2 py-1 text-xs rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium break-all">
                        {reply}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingReplyIndex(index);
                            setEditingReplyText(reply);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white text-[11px] font-bold cursor-pointer px-1.5"
                          title="Edit text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuickReply(index)}
                          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 cursor-pointer"
                          title="Delete quick reply"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Quick Reply Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                + Add New Quick Reply
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 🔄 Customer requested transfer to Supervisor"
                  value={newQuickReplyText}
                  onChange={(e) => setNewQuickReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddQuickReply();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleAddQuickReply}
                  disabled={!newQuickReplyText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handleResetQuickReplies}
                className="text-[11px] text-slate-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Floor Defaults</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickRepliesManager(false);
                  setEditingReplyIndex(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Details Modal for Inspecting Shared Leads from Chat */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          lead={selectedLeadForDetails}
          isOpen={!!selectedLeadForDetails}
          onClose={() => setSelectedLeadForDetails(null)}
          isAdmin={currentUser?.role === "ADMIN"}
        />
      )}

      {/* Clear Messages Confirmation Modal */}
      {showClearConfirm && activeConversation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Eraser className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Clear Conversation Messages?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeConversation.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently wipe all messages inside this conversation. The conversation thread will remain in your list.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearConversation}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear Messages</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Modal */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Delete Entire Conversation?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {conversationToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingConv}
                onClick={() => setConversationToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingConv}
                onClick={() => handleDeleteConversation(conversationToDelete)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingConv ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Conversation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
