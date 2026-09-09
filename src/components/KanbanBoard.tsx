"use client";

import React, { useState, useMemo, useEffect } from "react";
import { LeadItem, adminDecisionAction, deleteLeadAction, updateLeadStatusWithCustomAction } from "@/app/actions/leads";
import { getCampaignsAction, CampaignItem } from "@/app/actions/campaigns";
import { LeadStatus } from "@prisma/client";
import { AdminDecisionModal } from "@/components/AdminDecisionModal";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { ModalPortal } from "@/components/ModalPortal";
import {
  Clock,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Check,
  Building2,
  Loader2,
  Eye,
  Search,
  GripVertical,
  Filter,
  Trash2,
} from "lucide-react";
import { shareLeadToChatAction } from "@/app/actions/messages";

interface KanbanBoardProps {
  leads: LeadItem[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

const COLUMNS: { id: LeadStatus; label: string; color: string; badgeBg: string }[] = [
  { id: "UPLOADED", label: "Uploaded Queue", color: "#3B82F6", badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { id: "PENDING_VERIFICATION", label: "Pending Verification", color: "#F59E0B", badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "CALL_BACK", label: "Call Backs", color: "#8B5CF6", badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { id: "VOICEMAIL", label: "Voicemail", color: "#64748B", badgeBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  { id: "APPROVED", label: "Approved (Verified)", color: "#10B981", badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { id: "REJECTED", label: "Rejected", color: "#EF4444", badgeBg: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  { id: "CUSTOM", label: "Custom / In-Progress", color: "#EC4899", badgeBg: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30" },
];

export function KanbanBoard({ leads, isAdmin = false, onRefresh }: KanbanBoardProps) {
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  useEffect(() => {
    getCampaignsAction().then((res) => setCampaigns(res));
  }, []);

  const [selectedLeadForDecision, setSelectedLeadForDecision] = useState<{
    leadId: string;
    leadCustomerName: string;
    mode: "REJECT" | "RECLASSIFY";
    currentStatus: LeadStatus;
    targetStatus?: LeadStatus;
  } | null>(null);

  const [inspectLead, setInspectLead] = useState<LeadItem | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingLead, setDeletingLead] = useState<LeadItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Custom Status Prompt Modal State
  const [customStatusLead, setCustomStatusLead] = useState<LeadItem | null>(null);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [isSavingCustomStatus, setIsSavingCustomStatus] = useState(false);

  const handleSaveCustomStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStatusLead || !customStatusInput.trim()) return;
    setIsSavingCustomStatus(true);
    const res = await updateLeadStatusWithCustomAction(
      customStatusLead.id,
      "CUSTOM",
      customStatusInput.trim()
    );
    if (!res.error) {
      setCustomStatusLead(null);
      setCustomStatusInput("");
      onRefresh();
    }
    setIsSavingCustomStatus(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLead) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteLeadAction(deletingLead.id);
    if (res.error) {
      setDeleteError(res.error);
      setIsDeleting(false);
    } else {
      setIsDeleting(false);
      setDeletingLead(null);
      onRefresh();
    }
  };
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Real-time filtering by search query & campaign
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        l.customerName.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        (l.closerName && l.closerName.toLowerCase().includes(search.toLowerCase())) ||
        (l.agentUsername && l.agentUsername.toLowerCase().includes(search.toLowerCase()));

      const matchCamp = selectedCampaign === "ALL" || l.campaignId === selectedCampaign;

      return matchSearch && matchCamp;
    });
  }, [leads, search, selectedCampaign]);

  const handleShareLead = async (lead: LeadItem) => {
    setSharingId(lead.id);
    const res = await shareLeadToChatAction({
      leadId: lead.id,
      note: `Sharing Lead: ${lead.customerName} (${lead.campaignName || "Campaign"}) - Status: ${lead.status}`,
    });
    if (res.success) {
      setShareSuccess(`Lead "${lead.customerName}" shared to Pulse Chat!`);
      setTimeout(() => setShareSuccess(null), 3500);
    }
    setSharingId(null);
  };

  const handleFastApprove = async (leadId: string) => {
    setApprovingId(leadId);
    const res = await adminDecisionAction(leadId, "APPROVED");
    if (!res.error) {
      onRefresh();
    }
    setApprovingId(null);
  };

  const handleStartReject = (lead: LeadItem) => {
    setSelectedLeadForDecision({
      leadId: lead.id,
      leadCustomerName: lead.customerName,
      mode: "REJECT",
      currentStatus: lead.status,
      targetStatus: "REJECTED",
    });
  };

  const handleMoveStatus = (lead: LeadItem, targetStatus: LeadStatus) => {
    if (lead.status === targetStatus && targetStatus !== "CUSTOM") return;

    // If target is CUSTOM, open custom status modal to allow entering custom status label
    if (targetStatus === "CUSTOM") {
      setCustomStatusLead(lead);
      setCustomStatusInput(lead.customStatusLabel || "");
      return;
    }

    // If moving an already APPROVED lead, require reclassification modal with justification
    if (lead.status === "APPROVED") {
      setSelectedLeadForDecision({
        leadId: lead.id,
        leadCustomerName: lead.customerName,
        mode: "RECLASSIFY",
        currentStatus: lead.status,
        targetStatus,
      });
      return;
    }

    if (targetStatus === "REJECTED") {
      handleStartReject(lead);
      return;
    }

    if (targetStatus === "APPROVED") {
      handleFastApprove(lead.id);
      return;
    }

    // Direct move for other statuses
    setSelectedLeadForDecision({
      leadId: lead.id,
      leadCustomerName: lead.customerName,
      mode: "RECLASSIFY",
      currentStatus: lead.status,
      targetStatus,
    });
  };

  return (
    <div className="w-full">
      {/* Toast Notification when Lead is Shared to Chat */}
      {shareSuccess && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="w-4 h-4 text-white" />
          <span>{shareSuccess}</span>
        </div>
      )}

      {/* Kanban Board Toolbar: Real-time Search, Campaign Filter & Quick Count Pills */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, closer..."
              className="liquid-glass-input w-full pl-10 pr-4 py-2 rounded-2xl text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="liquid-glass-input px-3 py-2 rounded-xl text-xs focus:outline-none font-semibold"
            >
              <option value="ALL">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Leads Count Pill + Scroll Hint */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 font-mono text-[11px] font-bold">
            Showing {filteredLeads.length} of {leads.length} Leads
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            (Swipe / Scroll horizontally ⇄)
          </span>
        </div>
      </div>

      {/* Kanban Horizontal Scrollable Track */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[660px] custom-scrollbar">
        {COLUMNS.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.id);

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverColumn !== col.id) setDragOverColumn(col.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const droppedId = e.dataTransfer.getData("text/plain") || draggedLeadId;
                if (!droppedId) return;
                const targetLead = leads.find((l) => l.id === droppedId);
                if (targetLead && targetLead.status !== col.id) {
                  handleMoveStatus(targetLead, col.id);
                }
              }}
              className={`w-[320px] min-w-[320px] shrink-0 liquid-glass rounded-3xl p-4 border transition-all duration-200 flex flex-col min-h-[580px] ${
                dragOverColumn === col.id
                  ? "border-orange-500/60 bg-orange-500/10 shadow-lg ring-2 ring-orange-500/30 scale-[1.01]"
                  : "border-white/70 dark:border-slate-800"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="text-xs font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider">
                    {col.label}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${col.badgeBg}`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-1 custom-scrollbar">
                {colLeads.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center p-3 text-[11px] text-[#94A3B8] border border-dashed border-slate-200/60 dark:border-slate-800 rounded-2xl">
                    No leads in this column (Drop card here)
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setInspectLead(lead)}
                      className={`liquid-glass-card p-3.5 rounded-2xl border border-white/90 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-orange-400/50 dark:hover:border-orange-500/50 transition-all group relative cursor-pointer ${
                        draggedLeadId === lead.id ? "opacity-35 border-dashed border-orange-400 scale-[0.98]" : ""
                      }`}
                    >
                      {/* Top: Customer Name & Drag Handle & Campaign Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectLead(lead);
                            }}
                            className="font-extrabold text-sm text-[#0F172A] dark:text-white hover:text-[#F97316] dark:hover:text-[#FB923C] truncate cursor-pointer"
                            title={`Inspect: ${lead.customerName}`}
                          >
                            {lead.customerName}
                          </h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 truncate max-w-[170px]">
                            {lead.campaignName || "General Campaign"}
                          </span>
                        </div>

                        {/* Drag Handle Grip (Keeps drag isolated so clicking card opens details reliably) */}
                        <div
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedLeadId(lead.id);
                            e.dataTransfer.setData("text/plain", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation();
                            setDraggedLeadId(null);
                            setDragOverColumn(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          title="Drag card to move column"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing shrink-0"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Phone & Closer Details */}
                      <div className="space-y-1.5 mb-3 text-xs">
                        <div className="flex items-center gap-1.5 text-[#475569] dark:text-[#94A3B8]">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-bold text-[#0F172A] dark:text-white">
                            {lead.mobile}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8]">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            Closer:{" "}
                            {lead.closerName && lead.closerName.toLowerCase().includes("self") ? (
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Self-Closed 🎯
                              </strong>
                            ) : (
                              <strong className="text-slate-700 dark:text-slate-200">
                                {lead.closerName || "Unassigned"}
                              </strong>
                            )}
                          </span>
                        </div>

                        {/* Client SLA */}
                        {lead.clientName && (
                          <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-1 truncate text-slate-700 dark:text-slate-300 font-medium">
                              <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{lead.clientName}</span>
                            </div>
                            <span
                              className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                                lead.isOverdue
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-black animate-pulse"
                                  : (lead.daysRemaining ?? 10) <= 2
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {lead.clientNetTerms?.replace("_", " ")} · {lead.slaLabel || "Active"}
                            </span>
                          </div>
                        )}

                        {/* Callback Banner */}
                        {lead.status === "CALL_BACK" && lead.callBackTime && (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold text-[10px] bg-purple-500/10 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {new Date(lead.callBackTime).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}

                        {/* Custom Status Chip */}
                        {lead.status === "CUSTOM" && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomStatusLead(lead);
                              setCustomStatusInput(lead.customStatusLabel || "");
                            }}
                            className="flex items-center justify-between text-pink-700 dark:text-pink-300 font-bold text-[10px] bg-pink-500/15 border border-pink-500/30 px-2 py-1 rounded-lg hover:bg-pink-500/25 transition-colors cursor-pointer"
                            title="Click to edit custom status"
                          >
                            <span className="flex items-center gap-1 truncate">
                              <span>✨</span>
                              <span className="truncate">{lead.customStatusLabel || "Custom Status"}</span>
                            </span>
                            <span className="text-[9px] opacity-70 underline shrink-0">edit</span>
                          </div>
                        )}

                        {/* Rejection Banner */}
                        {lead.status === "REJECTED" && lead.rejectionReason && (
                          <div className="text-red-600 dark:text-red-400 text-[10px] bg-red-500/10 px-2 py-1 rounded-lg font-medium">
                            ⚠️ {lead.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Primary "View Info" Button & Quick Controls */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1"
                      >
                        {/* Agent handle & Info button */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectLead(lead)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-500/10 hover:bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            title="Open full Lead Info modal"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Info</span>
                          </button>

                          <span className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[70px]">
                            @{lead.agentUsername}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleShareLead(lead)}
                            disabled={sharingId === lead.id}
                            title="Share Lead to Floor Pulse Chat"
                            className="p-1.5 rounded-lg hover:bg-orange-500/15 text-[#EA580C] dark:text-orange-400 cursor-pointer transition-colors disabled:opacity-60"
                          >
                            {sharingId === lead.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#EA580C]" />
                            ) : (
                              <MessageSquare className="w-3 h-3" />
                            )}
                          </button>

                          {isAdmin && (
                            <>
                              {lead.status !== "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleFastApprove(lead.id)}
                                  disabled={approvingId === lead.id}
                                  title="Approve Lead & Credit Commission"
                                  className="p-1 rounded-lg hover:bg-emerald-500/15 text-[#059669] cursor-pointer disabled:opacity-60"
                                >
                                  {approvingId === lead.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {lead.status !== "REJECTED" && (
                                <button
                                  type="button"
                                  onClick={() => handleStartReject(lead)}
                                  title="Reject Lead"
                                  className="p-1 rounded-lg hover:bg-red-500/15 text-[#EF4444] cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Status Dropdown */}
                              <select
                                value={lead.status}
                                onChange={(e) => handleMoveStatus(lead, e.target.value as LeadStatus)}
                                className="text-[10px] py-0.5 px-1 rounded bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700 cursor-pointer"
                                title="Change status"
                              >
                                <option value="UPLOADED">Upload</option>
                                <option value="PENDING_VERIFICATION">Verify</option>
                                <option value="CALL_BACK">Callback</option>
                                <option value="VOICEMAIL">Voicemail</option>
                                <option value="APPROVED">Approve</option>
                                <option value="REJECTED">Reject</option>
                                <option value="CUSTOM">Custom</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => setDeletingLead(lead)}
                                title="Permanently Delete Lead"
                                className="p-1 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection / Reclassification Justification Modal */}
      {selectedLeadForDecision && (
        <AdminDecisionModal
          isOpen={true}
          onClose={() => setSelectedLeadForDecision(null)}
          onSuccess={() => {
            setSelectedLeadForDecision(null);
            onRefresh();
          }}
          leadId={selectedLeadForDecision.leadId}
          leadCustomerName={selectedLeadForDecision.leadCustomerName}
          mode={selectedLeadForDecision.mode}
          currentStatus={selectedLeadForDecision.currentStatus}
          targetStatus={selectedLeadForDecision.targetStatus}
        />
      )}

      {/* Unified High-Contrast Lead Details Modal */}
      <LeadDetailsModal
        isOpen={!!inspectLead}
        lead={inspectLead}
        onClose={() => setInspectLead(null)}
        isAdmin={isAdmin}
        onRefresh={onRefresh}
        onOpenDecision={(lead, mode, targetStatus) => {
          setSelectedLeadForDecision({
            leadId: lead.id,
            leadCustomerName: lead.customerName,
            mode,
            currentStatus: lead.status,
            targetStatus,
          });
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingLead && (
        <ModalPortal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                Permanently Delete Lead?
              </h4>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete lead for <strong className="text-[#0F172A] dark:text-white">{deletingLead.customerName}</strong> ({deletingLead.mobile})? All campaign records, status history, and associated earnings will be removed.
              </p>

              {deleteError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-2.5 font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {deleteError}
                </p>
              )}

              <div className="flex items-center gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingLead(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isDeleting ? "Deleting Lead..." : "Confirm Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Custom Status Prompt Modal */}
      {customStatusLead && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setCustomStatusLead(null);
            }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setCustomStatusLead(null)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-pink-500/15 flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                    Set Custom Lead Status
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Lead: <strong className="text-[#0F172A] dark:text-white">{customStatusLead.customerName}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCustomStatus} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300 mb-1">
                    Custom Status Title / Label *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    autoFocus
                    value={customStatusInput}
                    onChange={(e) => setCustomStatusInput(e.target.value)}
                    placeholder="e.g. Docs Pending Verification, VIP Callback..."
                    className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none border-pink-400/40 text-[#0F172A] dark:text-white"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Quick presets:</span>
                    {["Docs Under Review", "Callback Tomorrow", "VIP Client", "Payment Link Sent", "Manager Check"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomStatusInput(preset)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/70 dark:bg-slate-800 text-pink-700 dark:text-pink-300 border border-pink-500/30 hover:bg-pink-500/20 transition-all cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCustomStatusLead(null)}
                    className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCustomStatus || !customStatusInput.trim()}
                    className="liquid-glass-button flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90"
                  >
                    {isSavingCustomStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Status"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
