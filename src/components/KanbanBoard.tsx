"use client";

import React, { useState } from "react";
import { LeadItem, adminDecisionAction } from "@/app/actions/leads";
import { LeadStatus } from "@prisma/client";
import { AdminDecisionModal } from "@/components/AdminDecisionModal";
import {
  Clock,
  Phone,
  User,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Check,
  Building2,
} from "lucide-react";
import { shareLeadToChatAction } from "@/app/actions/messages";

interface KanbanBoardProps {
  leads: LeadItem[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

const COLUMNS: { id: LeadStatus; label: string; color: string; badgeBg: string }[] = [
  { id: "UPLOADED", label: "Uploaded Queue", color: "#3B82F6", badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { id: "PENDING_VERIFICATION", label: "Verification Pending", color: "#F59E0B", badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "CALL_BACK", label: "Call Backs", color: "#8B5CF6", badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { id: "VOICEMAIL", label: "Voicemail", color: "#64748B", badgeBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  { id: "APPROVED", label: "Approved (Verified)", color: "#10B981", badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { id: "REJECTED", label: "Rejected", color: "#EF4444", badgeBg: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
];

export function KanbanBoard({ leads, isAdmin = false, onRefresh }: KanbanBoardProps) {
  const [selectedLeadForDecision, setSelectedLeadForDecision] = useState<{
    leadId: string;
    leadCustomerName: string;
    mode: "REJECT" | "RECLASSIFY";
    currentStatus: LeadStatus;
    targetStatus?: LeadStatus;
  } | null>(null);

  const [inspectLead, setInspectLead] = useState<LeadItem | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleShareLead = async (lead: LeadItem) => {
    const res = await shareLeadToChatAction({
      leadId: lead.id,
      note: `Sharing Lead: ${lead.customerName} (${lead.campaignName || "Campaign"}) - Status: ${lead.status}`,
    });
    if (res.success) {
      setShareSuccess(`Lead "${lead.customerName}" shared to Pulse Chat!`);
      setTimeout(() => setShareSuccess(null), 3500);
    }
  };

  const handleFastApprove = async (leadId: string) => {
    const res = await adminDecisionAction(leadId, "APPROVED");
    if (!res.error) {
      onRefresh();
    }
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
    if (lead.status === targetStatus) return;

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

      {/* Kanban Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);

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
              className={`liquid-glass rounded-3xl p-3.5 sm:p-4 border transition-all duration-200 flex flex-col min-h-[580px] ${
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
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[640px] pr-0.5 custom-scrollbar">
                {colLeads.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center p-3 text-[11px] text-[#94A3B8] border border-dashed border-slate-200/60 dark:border-slate-800 rounded-2xl">
                    No leads in this column (Drop card here)
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => {
                        setDraggedLeadId(lead.id);
                        e.dataTransfer.setData("text/plain", lead.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggedLeadId(null);
                        setDragOverColumn(null);
                      }}
                      className={`liquid-glass-card p-3.5 rounded-2xl border border-white/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing ${
                        draggedLeadId === lead.id ? "opacity-35 border-dashed border-orange-400 scale-[0.98]" : ""
                      }`}
                    >
                      {/* Top: Customer Name & Campaign Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4
                          onClick={() => setInspectLead(lead)}
                          className="font-extrabold text-xs text-[#0F172A] dark:text-white hover:text-[#F97316] cursor-pointer truncate"
                        >
                          {lead.customerName}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] shrink-0 border border-orange-500/20">
                          {(lead.campaignName || "General").split(" ")[0]}
                        </span>
                      </div>

                      {/* Phone & Closer */}
                      <div className="space-y-1 mb-2.5 text-[11px]">
                        <div className="flex items-center gap-1.5 text-[#475569] dark:text-[#94A3B8]">
                          <Phone className="w-3 h-3 text-[#94A3B8]" />
                          <span className="font-mono font-bold text-[#0F172A] dark:text-white">{lead.mobile}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8]">
                          <User className="w-3 h-3 text-[#94A3B8]" />
                          <span>
                            Closer: <strong>{lead.closerName}</strong>
                          </span>
                        </div>
                        {lead.clientName && (
                          <div className="flex items-center gap-1.5 text-[10px] mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[95px]">
                              {lead.clientName}
                            </span>
                            <span
                              className={`ml-auto font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border whitespace-nowrap ${
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
                        {lead.status === "CALL_BACK" && lead.callBackTime && (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold text-[10px] bg-purple-500/10 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
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
                        {lead.rejectionReason && (
                          <div className="text-red-600 dark:text-red-400 text-[10px] bg-red-500/10 px-2 py-1 rounded-lg">
                            ⚠️ {lead.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            @{lead.agentUsername}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareLead(lead);
                            }}
                            title="Share Lead to Floor Pulse Chat"
                            className="p-1 rounded-lg hover:bg-orange-500/15 text-[#EA580C] dark:text-orange-400 cursor-pointer transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {lead.status !== "APPROVED" && (
                              <button
                                type="button"
                                onClick={() => handleFastApprove(lead.id)}
                                title="Approve Lead & Credit Incentive"
                                className="p-1 rounded-lg hover:bg-emerald-500/15 text-[#059669] cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {lead.status !== "REJECTED" && (
                              <button
                                type="button"
                                onClick={() => handleStartReject(lead)}
                                title="Reject Lead (Requires Reason)"
                                className="p-1 rounded-lg hover:bg-red-500/15 text-[#EF4444] cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Move dropdown */}
                            <select
                              value={lead.status}
                              onChange={(e) => handleMoveStatus(lead, e.target.value as LeadStatus)}
                              className="text-[10px] py-0.5 px-1 rounded bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-[#94A3B8] border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Move Status"
                            >
                              <option value="UPLOADED">Upload</option>
                              <option value="PENDING_VERIFICATION">Verify</option>
                              <option value="CALL_BACK">Callback</option>
                              <option value="VOICEMAIL">Voicemail</option>
                              <option value="APPROVED">Approve</option>
                              <option value="REJECTED">Reject</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Modal */}
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

      {/* Lead Details Drawer / Modal */}
      {inspectLead && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectLead(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="liquid-glass w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                  {inspectLead.customerName}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {inspectLead.campaignName} • Source: {inspectLead.source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectLead(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Mobile Number</span>
                  <p className="font-mono font-bold text-[#0F172A] dark:text-white mt-0.5">{inspectLead.mobile}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Date of Birth</span>
                  <p className="font-mono text-[#0F172A] dark:text-white mt-0.5">{inspectLead.dob}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Email Address</span>
                  <p className="font-semibold text-[#0F172A] dark:text-white mt-0.5">{inspectLead.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Assigned Closer</span>
                  <p className="font-semibold text-[#0F172A] dark:text-white mt-0.5">{inspectLead.closerName}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Street Address</span>
                <p className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-[#475569] dark:text-[#CBD5E1] mt-1">
                  {inspectLead.address}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Agent Notes</span>
                <p className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-[#475569] dark:text-[#CBD5E1] mt-1">
                  {inspectLead.notes || "No notes recorded."}
                </p>
              </div>

              {/* Status History Audit Trail */}
              <div>
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase">Audit Trail & Status History</span>
                <div className="mt-1.5 space-y-2">
                  {inspectLead.history.map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 text-[11px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0F172A] dark:text-white">
                          {h.fromStatus} $\rightarrow$ {h.toStatus}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[#64748B] dark:text-[#94A3B8]">
                        By <strong>{h.changedByName}</strong>: {h.reason || "Updated"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleShareLead(inspectLead);
                }}
                className="liquid-glass-button w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span>Share Lead into Floor Pulse Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
