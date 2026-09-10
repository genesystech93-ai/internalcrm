"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Users,
  Shield,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileText,
} from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";
import { LeadItem } from "@/app/actions/leads";
import {
  shareLeadToChatAction,
  getStaffDirectoryAction,
} from "@/app/actions/messages";
import { StaffMember } from "@/lib/chat-store";

interface ShareLeadModalProps {
  isOpen: boolean;
  lead: LeadItem | null;
  onClose: () => void;
  onSuccess?: (info: string) => void;
}

type DestinationType = "GENERAL" | "ADMIN" | "AGENT";

export function ShareLeadModal({
  isOpen,
  lead,
  onClose,
  onSuccess,
}: ShareLeadModalProps) {
  const [targetType, setTargetType] = useState<DestinationType>("GENERAL");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchStaff, setSearchStaff] = useState("");
  const [note, setNote] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getStaffDirectoryAction().then((list) => {
        setStaffList(list);
        if (list.length > 0 && !selectedAgentId) {
          setSelectedAgentId(list[0].id);
        }
      });
      setError(null);
    }
  }, [isOpen, selectedAgentId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const filteredStaff = staffList.filter((s) => {
    const q = searchStaff.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.teamName && s.teamName.toLowerCase().includes(q))
    );
  });

  const selectedAgent = staffList.find((s) => s.id === selectedAgentId);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetType === "AGENT" && !selectedAgentId) {
      setError("Please select an agent or colleague to receive the lead.");
      return;
    }

    setIsSharing(true);
    setError(null);

    const res = await shareLeadToChatAction({
      leadId: lead.id,
      targetType,
      recipientId: targetType === "AGENT" ? selectedAgentId : undefined,
      note: note.trim() || undefined,
      caseDetails: lead.caseDetails || undefined,
    });

    setIsSharing(false);

    if (res.success) {
      let destLabel = "General Floor Pulse Chat";
      if (targetType === "ADMIN") destLabel = "Admin Desk";
      if (targetType === "AGENT" && selectedAgent) destLabel = `@${selectedAgent.username} (${selectedAgent.name})`;

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("crm:open-chat", {
            detail: {
              conversationId: res.conversationId,
              leadId: lead.id,
            },
          })
        );
      }

      onSuccess?.(`Lead "${lead.customerName}" & Case shared to ${destLabel}!`);
      onClose();
    } else {
      setError(res.error || "Failed to share lead to Pulse Chat.");
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="w-full max-w-lg rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Share2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                  Share Lead & Case to Pulse Chat
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Select where to dispatch this lead record across the floor.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleShare} className="space-y-4 pt-4 overflow-y-auto flex-1 pr-1">
            {/* Lead & Case Preview Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-[#0F172A] dark:text-white truncate">
                  👤 {lead.customerName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  {lead.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                <div>📱 {lead.mobile || "No Mobile"}</div>
                <div className="truncate">🏷️ {lead.campaignName || "General"}</div>
              </div>
              {lead.caseDetails && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 block mb-0.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>Attached Case Details ({lead.caseDetails.length.toLocaleString()} chars)</span>
                  </span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-sans line-clamp-2 italic bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/40">
                    &ldquo;{lead.caseDetails}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Destination Selection */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-2">
                Choose Where to Send the Lead *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. General Floor */}
                <button
                  type="button"
                  onClick={() => setTargetType("GENERAL")}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    targetType === "GENERAL"
                      ? "bg-orange-500/10 border-orange-500 text-[#EA580C] dark:text-orange-400 ring-2 ring-orange-500/20"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    {targetType === "GENERAL" && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block text-[#0F172A] dark:text-white">General Floor</span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block leading-tight">
                      All floor staff & public room
                    </span>
                  </div>
                </button>

                {/* 2. Admin Desk */}
                <button
                  type="button"
                  onClick={() => setTargetType("ADMIN")}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    targetType === "ADMIN"
                      ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/15 flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    {targetType === "ADMIN" && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block text-[#0F172A] dark:text-white">Admin Desk</span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block leading-tight">
                      Direct private message to Admin
                    </span>
                  </div>
                </button>

                {/* 3. Specific Agent */}
                <button
                  type="button"
                  onClick={() => setTargetType("AGENT")}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    targetType === "AGENT"
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    {targetType === "AGENT" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block text-[#0F172A] dark:text-white">Specific Agent</span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block leading-tight">
                      Pick any teammate / closer
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Specific Agent Picker (Visible when targetType === 'AGENT') */}
            {targetType === "AGENT" && (
              <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    Select Recipient Colleague
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {staffList.length} colleagues available
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchStaff}
                    onChange={(e) => setSearchStaff(e.target.value)}
                    placeholder="Search by name, @username, or role..."
                    className="liquid-glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1 bg-white/50 dark:bg-slate-900/50">
                  {filteredStaff.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">No matching staff found.</p>
                  ) : (
                    filteredStaff.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => setSelectedAgentId(staff.id)}
                        className={`w-full p-2 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer text-xs ${
                          selectedAgentId === staff.id
                            ? "bg-blue-600 text-white font-bold"
                            : "hover:bg-blue-500/10 text-[#0F172A] dark:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            selectedAgentId === staff.id ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          }`}>
                            {staff.name.charAt(0)}
                          </span>
                          <span className="truncate">{staff.name}</span>
                          <span className={`text-[10px] font-mono ${selectedAgentId === staff.id ? "text-blue-100" : "text-slate-400"}`}>
                            @{staff.username}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            selectedAgentId === staff.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}>
                            {staff.role}
                          </span>
                          <span className={`w-2 h-2 rounded-full ${
                            staff.shiftStatus === "ON_SHIFT"
                              ? "bg-emerald-500"
                              : staff.shiftStatus === "ON_BREAK"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`} title={staff.shiftStatus} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Optional Note to Recipient */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                Optional Message / Note to Recipient
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please review this case, customer is requesting a quick callback..."
                className="liquid-glass-input w-full px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSharing}
                className="liquid-glass-button-secondary py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSharing}
                className="liquid-glass-button-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-60"
              >
                {isSharing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isSharing ? "Sharing to Pulse Chat..." : "Share to Pulse Chat"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
