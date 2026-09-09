"use client";

import React, { useState } from "react";
import { LeadItem, adminDecisionAction, updateLeadCloserAction, deleteLeadAction } from "@/app/actions/leads";
import { shareLeadToChatAction } from "@/app/actions/messages";
import { LeadStatus } from "@prisma/client";
import {
  X,
  Phone,
  Mail,
  Calendar,
  User,
  Clock,
  MapPin,
  Building2,
  FileText,
  History,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Edit2,
  Loader2,
  Share2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

interface LeadDetailsModalProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onRefresh?: () => void;
  onOpenDecision?: (lead: LeadItem, mode: "REJECT" | "RECLASSIFY", targetStatus?: LeadStatus) => void;
}

export function LeadDetailsModal({
  lead,
  isOpen,
  onClose,
  isAdmin = false,
  onRefresh,
  onOpenDecision,
}: LeadDetailsModalProps) {
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isEditingCloser, setIsEditingCloser] = useState(false);
  const [editCloserVal, setEditCloserVal] = useState("");
  const [isSavingCloser, setIsSavingCloser] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const handleDeleteLead = async () => {
    if (!lead) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteLeadAction(lead.id);
    if (res.error) {
      setDeleteError(res.error);
      setIsDeleting(false);
    } else {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      onRefresh?.();
      onClose();
    }
  };

  const handleCopy = (text: string, type: "mobile" | "email") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "mobile") {
        setCopiedMobile(true);
        setTimeout(() => setCopiedMobile(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const res = await shareLeadToChatAction({
      leadId: lead.id,
      note: `Lead Details: ${lead.customerName} (${lead.campaignName || "Campaign"}) - Status: ${lead.status}`,
    });
    if (res.success) {
      setShareFeedback("Shared to Pulse Chat!");
      setTimeout(() => setShareFeedback(null), 3000);
    }
    setIsSharing(false);
  };

  const handleFastApprove = async () => {
    setIsApproving(true);
    const res = await adminDecisionAction(lead.id, "APPROVED");
    if (!res.error) {
      onRefresh?.();
      onClose();
    }
    setIsApproving(false);
  };

  const handleSaveCloser = async () => {
    if (!editCloserVal.trim()) return;
    setIsSavingCloser(true);
    const res = await updateLeadCloserAction(lead.id, editCloserVal.trim());
    if (!res.error) {
      lead.closerName = editCloserVal.trim();
      setIsEditingCloser(false);
      onRefresh?.();
    }
    setIsSavingCloser(false);
  };

  const getStatusBadgeClass = (status: LeadStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "REJECTED":
        return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
      case "CALL_BACK":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
      case "PENDING_VERIFICATION":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "VOICEMAIL":
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
      case "UPLOADED":
      default:
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    }
  };

  const isSelfClosed = lead.closerName && lead.closerName.toLowerCase().includes("self");

  return (
    <ModalPortal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] flex flex-col my-auto overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                  {lead.customerName}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(lead.status)}`}>
                  ● {lead.status.replace("_", " ")}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
                  {lead.campaignName || "General Campaign"}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Intake Source: <strong className="text-[#0F172A] dark:text-white">{lead.source}</strong> • Submitted by <strong className="text-[#0F172A] dark:text-white">@{lead.agentUsername}</strong> ({lead.agentName}) on {new Date(lead.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 text-xs">
            {/* Critical Callouts (Callbacks or Rejections) */}
            {lead.status === "CALL_BACK" && lead.callBackTime && (
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-300 flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <p className="font-bold text-xs">Scheduled Floor Call Back</p>
                  <p className="text-[11px] opacity-90">
                    Agent scheduled callback for: <strong>{new Date(lead.callBackTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>
                  </p>
                </div>
              </div>
            )}

            {lead.status === "REJECTED" && lead.rejectionReason && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Quality Audit Rejection Justification</p>
                  <p className="text-[11px] opacity-90 mt-0.5">&ldquo;{lead.rejectionReason}&rdquo;</p>
                </div>
              </div>
            )}

            {/* Core Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mobile Phone */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Phone</span>
                    <a href={`tel:${lead.mobile}`} className="font-mono font-bold text-sm text-[#0F172A] dark:text-white hover:text-orange-500 transition-colors">
                      {lead.mobile}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(lead.mobile, "mobile")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  title="Copy Phone Number"
                >
                  {copiedMobile ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Email Address */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <a href={`mailto:${lead.email}`} className="font-semibold text-xs text-[#0F172A] dark:text-white hover:text-orange-500 transition-colors truncate block">
                      {lead.email}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(lead.email, "email")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 cursor-pointer transition-colors shrink-0 ml-1"
                  title="Copy Email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Date of Birth */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                  <p className="font-mono font-bold text-xs text-[#0F172A] dark:text-white">{lead.dob}</p>
                </div>
              </div>

              {/* Assigned Closer */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Closer</span>
                  {!isEditingCloser && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditCloserVal(lead.closerName);
                        setIsEditingCloser(true);
                      }}
                      className="text-[10px] font-bold text-[#EA580C] dark:text-[#FB923C] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>Edit Closer</span>
                    </button>
                  )}
                </div>

                {isEditingCloser ? (
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editCloserVal}
                        onChange={(e) => setEditCloserVal(e.target.value)}
                        placeholder="Closer Name or Self"
                        className="liquid-glass-input w-full px-2.5 py-1 text-xs rounded-xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEditCloserVal("Self (Agent Closed)")}
                        className="px-2 py-1 rounded-xl text-[10px] font-bold bg-orange-500/15 text-[#EA580C] whitespace-nowrap cursor-pointer hover:bg-orange-500/25"
                      >
                        + Self
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingCloser}
                        onClick={handleSaveCloser}
                        className="px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                      >
                        {isSavingCloser ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingCloser}
                        onClick={() => setIsEditingCloser(false)}
                        className="px-2.5 py-1 rounded-xl text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs text-[#0F172A] dark:text-white">{lead.closerName}</p>
                    {isSelfClosed && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Self-Closed 🎯
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Client SLA Section if submitted */}
            {lead.clientName && (
              <div className="p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#F97316]" />
                    <span className="font-bold text-xs text-[#0F172A] dark:text-white">Client SLA & Submission</span>
                  </div>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    lead.isOverdue
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  }`}>
                    {lead.slaLabel || "Active"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                  <div>Assigned Client: <strong className="text-[#0F172A] dark:text-white">{lead.clientName}</strong></div>
                  <div>Terms: <strong className="text-[#0F172A] dark:text-white">{lead.clientNetTerms?.replace("_", " ")}</strong></div>
                  {lead.expectedApprovalDate && (
                    <div className="col-span-2">
                      Expected Decision Date: <strong className="text-[#0F172A] dark:text-white">{new Date(lead.expectedApprovalDate).toLocaleDateString()}</strong> ({lead.daysRemaining ?? 0} days remaining)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Street Address</span>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                  {lead.address}
                </p>
              </div>
            </div>

            {/* Agent Notes */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Agent Notes & Remarks</span>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-[#475569] dark:text-[#CBD5E1] italic">
                  {lead.notes ? `"${lead.notes}"` : "No internal notes recorded for this lead."}
                </p>
              </div>
            </div>

            {/* Audit Trail & Status History */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-orange-500" />
                <span>Audit Trail & Quality History ({lead.history.length})</span>
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                {lead.history.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">No status changes recorded yet.</p>
                ) : (
                  lead.history.map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-[11px] shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1">
                          <span className="text-slate-400">{h.fromStatus}</span>
                          <span>&rarr;</span>
                          <span className="text-[#EA580C] dark:text-[#FB923C]">{h.toStatus}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        By <strong className="text-slate-700 dark:text-slate-200">{h.changedByName}</strong>: {h.reason || "Status update"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="liquid-glass-button-secondary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5 text-[#EA580C]" />}
                <span>{shareFeedback || "Share to Pulse Chat"}</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-rose-500/25 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
                  title="Permanently Delete Lead Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {isAdmin && lead.status !== "APPROVED" && (
                <button
                  type="button"
                  onClick={handleFastApprove}
                  disabled={isApproving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve Lead</span>
                </button>
              )}

              {isAdmin && lead.status !== "REJECTED" && onOpenDecision && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDecision(lead, "REJECT", "REJECTED");
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="liquid-glass-button-secondary py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                  Permanently Delete Lead Record?
                </h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[#0F172A] dark:text-white">{lead.customerName}</strong> ({lead.mobile})? All campaign records, status history, and associated earnings will be removed. This action cannot be undone.
                </p>

                {deleteError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2.5 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    {deleteError}
                  </p>
                )}

                <div className="flex items-center gap-2.5 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteLead}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{isDeleting ? "Deleting Lead..." : "Confirm Delete"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
