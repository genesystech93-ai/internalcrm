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
} from "lucide-react";
import {
  getConversationsAction,
  getMessagesAction,
  sendMessageAction,
  getUnreadMessageCountAction,
  getStaffDirectoryAction,
  ConversationView,
  ChatMessageView,
} from "@/app/actions/messages";
import { StaffMember } from "@/lib/chat-store";

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
  const [activeTab, setActiveTab] = useState<"conversations" | "directory">("conversations");
  const [conversations, setConversations] = useState<ConversationView[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationView | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevTotalUnreadRef = useRef(0);

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

  // When opening a conversation
  const handleSelectConversation = (conv: ConversationView) => {
    setActiveConversation(conv);
    loadMessages(conv.id);
    // Optimistically decrement unread
    setTotalUnread((prev) => Math.max(0, prev - conv.unreadCount));
    conv.unreadCount = 0;
  };

  // Start new direct chat with a staff member
  const handleStartDirectChat = async (colleague: StaffMember) => {
    // Check if conversation already exists in conversations list
    const existing = conversations.find(
      (c) => c.type === "DIRECT" && c.recipientId === colleague.id
    );

    if (existing) {
      setActiveConversation(existing);
      loadMessages(existing.id);
      setActiveTab("conversations");
    } else {
      // Construct an immediate temporary direct conversation view
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
    if (!inputContent.trim() || isSending || !activeConversation) return;

    const textToSend = inputContent.trim();
    setInputContent("");
    setIsSending(true);

    try {
      const isTemp = activeConversation.id.startsWith("temp-");
      const res = await sendMessageAction({
        conversationId: isTemp ? undefined : activeConversation.id,
        recipientId: isTemp ? activeConversation.recipientId : undefined,
        channelType: activeConversation.type,
        content: textToSend,
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        // Update current conversation ID if it was temporary
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
    } finally {
      setIsSending(false);
    }
  };

  // Filtered lists
  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = staffDirectory.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper for role pill styling
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

  // Helper for presence status dot
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

  return (
    <>
      {/* Floating Bottom-Right Launcher Widget */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
              </p>
              <p className="text-[10px] text-orange-100/90 font-medium">
                {totalUnread > 0 ? `${totalUnread} new message${totalUnread > 1 ? "s" : ""}` : "Staff Floor Active"}
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Expandable Docked Chat Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[94vw] sm:w-[440px] h-[610px] max-h-[90vh] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Top Bar / Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {activeConversation ? (
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
              )}

              <div>
                {activeConversation ? (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {activeConversation.name}
                      </span>
                      {activeConversation.recipientRole && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getRoleBadge(
                            activeConversation.recipientRole
                          )}`}
                        >
                          {activeConversation.recipientRole}
                        </span>
                      )}
                    </div>
                    <div>{getStatusDot(activeConversation.recipientShiftStatus)}</div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Genesoft Pulse Chat</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                        Live Floor
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Internal messaging & team channels
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-xl transition-colors ${
                  soundEnabled
                    ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800"
                    : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={soundEnabled ? "Mute audio notifications" : "Enable sound"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Minimize chat"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body: Switch between Conversation List / Staff Directory / Active Chat */}
          {!activeConversation ? (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Search & Tabs */}
              <div className="p-3 border-b border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chats, colleagues, or roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/80">
                  <button
                    onClick={() => setActiveTab("conversations")}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "conversations"
                        ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Conversations ({conversations.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("directory");
                      loadStaffDirectory();
                    }}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                      activeTab === "directory"
                        ? "bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Directory</span>
                  </button>
                </div>
              </div>

              {/* View 1: Active Conversations List */}
              {activeTab === "conversations" ? (
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No conversations yet</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Open Staff Directory to message any colleague on the floor.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("directory");
                          loadStaffDirectory();
                        }}
                        className="mt-3 px-3 py-1.5 text-xs rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Find Colleague</span>
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full p-2.5 rounded-2xl text-left transition-all flex items-start gap-3 border cursor-pointer ${
                          conv.unreadCount > 0
                            ? "bg-orange-50/70 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-900/40 shadow-sm"
                            : "bg-white dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-800 hover:border-orange-200 dark:hover:border-slate-700 hover:bg-orange-50/30"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                              conv.type === "GENERAL"
                                ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white"
                                : conv.type === "TEAM"
                                ? "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white"
                                : "bg-gradient-to-tr from-slate-700 to-slate-900 text-white dark:from-slate-600 dark:to-slate-800"
                            }`}
                          >
                            {conv.avatarLetter}
                          </div>
                          {conv.type === "DIRECT" && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
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
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                              {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                            {conv.lastMessageText}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {conv.subtitle}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* View 2: Staff Directory & Quick New Chat */
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  <div className="px-2 py-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Active Floor Staff ({filteredStaff.length})
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      ● Ready to connect
                    </span>
                  </div>

                  {filteredStaff.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleStartDirectChat(person)}
                      className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800 hover:border-orange-300 dark:hover:border-slate-700 hover:bg-orange-50/30 transition-all flex items-center justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {person.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${getRoleBadge(
                                person.role
                              )}`}
                            >
                              {person.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            @{person.username} · {person.teamName || "Floor"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusDot(person.shiftStatus)}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Active Chat Thread View */
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60 dark:bg-slate-950/60">
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Sparkles className="w-8 h-8 text-orange-400 mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Beginning of conversation with {activeConversation.name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Say hello or share a lead for instant review!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.isOwn ? "items-end" : "items-start"} space-y-1`}
                    >
                      {!msg.isOwn && (
                        <div className="flex items-center gap-1.5 pl-1">
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

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                          msg.isOwn
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-xs"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs"
                        }`}
                      >
                        {/* Text Content */}
                        <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>

                        {/* Rich Lead Card if attached */}
                        {msg.metadata && (
                          <div
                            className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                              msg.isOwn
                                ? "bg-orange-700/30 border-orange-400/40 text-orange-50"
                                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1">
                                <span>📋 Lead:</span>
                                <span>{msg.metadata.customerName || "Customer"}</span>
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
                                {msg.metadata.status || "ACTIVE"}
                              </span>
                            </div>

                            <div className="text-[10px] opacity-90 flex items-center justify-between font-mono">
                              <span>📱 {msg.metadata.mobile || "10-digit"}</span>
                              <span>{msg.metadata.campaign || "Campaign"}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[9px] text-slate-400 px-1">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.isOwn && <CheckCheck className="w-3 h-3 text-orange-500" />}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-end gap-2"
              >
                <div className="flex-1 relative rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 transition-all">
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
                    className="w-full max-h-24 p-2.5 text-xs bg-transparent border-none resize-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputContent.trim() || isSending}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-md hover:shadow-orange-500/25 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all cursor-pointer"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
