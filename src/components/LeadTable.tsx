"use client";

import React, { useState, useMemo } from "react";
import { LeadItem, adminDecisionAction } from "@/app/actions/leads";
import { LeadStatus } from "@prisma/client";
import { AdminDecisionModal } from "@/components/AdminDecisionModal";
import { calculateRowHeight } from "@/lib/pretext-measure";
import { Search, CheckCircle2, XCircle, Clock, Eye, MessageSquare, Check, Building2 } from "lucide-react";
import { shareLeadToChatAction } from "@/app/actions/messages";
import { ClientSubmissionModal } from "@/components/ClientSubmissionModal";

interface LeadTableProps {
  leads: LeadItem[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

export function LeadTable({ leads, isAdmin = false, onRefresh }: LeadTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const [inspectLead, setInspectLead] = useState<LeadItem | null>(null);
  const [clientSubmitLead, setClientSubmitLead] = useState<LeadItem | null>(null);
  const [selectedLeadForDecision, setSelectedLeadForDecision] = useState<{
    leadId: string;
    leadCustomerName: string;
    mode: "REJECT" | "RECLASSIFY";
    currentStatus: LeadStatus;
    targetStatus?: LeadStatus;
  } | null>(null);

  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

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

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        l.customerName.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        l.email.toLowerCase().includes(search.toLowerCase());

      const matchCamp = selectedCampaign === "ALL" || l.campaignId === selectedCampaign;
      const matchStatus = selectedStatus === "ALL" || l.status === selectedStatus;

      return matchSearch && matchCamp && matchStatus;
    });
  }, [leads, search, selectedCampaign, selectedStatus]);

  const handleFastApprove = async (leadId: string) => {
    const res = await adminDecisionAction(leadId, "APPROVED");
    if (!res.error) onRefresh();
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

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30";
      case "REJECTED":
        return "bg-red-500/15 text-[#EF4444] dark:text-red-400 border border-red-500/30";
      case "CALL_BACK":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30";
      case "PENDING_VERIFICATION":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30";
      case "VOICEMAIL":
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30";
      default:
        return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30";
    }
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, mobile, email..."
            className="liquid-glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="liquid-glass-input px-3 py-2 rounded-xl text-xs focus:outline-none font-semibold"
          >
            <option value="ALL">All Campaigns</option>
            <option value="camp-health-1">USA Health Advantage</option>
            <option value="camp-medicare-1">Medicare Advantage Plus</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="liquid-glass-input px-3 py-2 rounded-xl text-xs focus:outline-none font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="UPLOADED">Uploaded</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="CALL_BACK">Call Back</option>
            <option value="VOICEMAIL">Voicemail</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="liquid-glass-card rounded-3xl border border-white/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4">Customer Name & DOB</th>
                <th className="py-3 px-3">Contact (Mobile & Email)</th>
                <th className="py-3 px-3">Campaign & Source</th>
                <th className="py-3 px-3">Client & Net Approval SLA</th>
                <th className="py-3 px-3">Closer / Agent</th>
                <th className="py-3 px-3">Status & Callback</th>
                <th className="py-3 px-4">Address & Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  // Pretext measure calculated row height
                  const rowHeight = calculateRowHeight(lead.address, lead.notes);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-[#0F172A] dark:text-white">{lead.customerName}</p>
                        <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">DOB: {lead.dob}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-mono font-bold text-[#0F172A] dark:text-white">{lead.mobile}</p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[140px]">{lead.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
                          {lead.campaignName}
                        </span>
                        <p className="text-[10px] text-[#94A3B8] mt-1">{lead.source}</p>
                      </td>
                      {/* Client & Net Approval SLA */}
                      <td className="py-3 px-3">
                        {lead.clientName ? (
                          <div>
                            <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-[11px]">
                              <Building2 className="w-3 h-3 text-orange-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{lead.clientName}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full border whitespace-nowrap ${
                                  lead.isOverdue
                                    ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-black animate-pulse"
                                    : (lead.daysRemaining ?? 10) <= 2
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {lead.clientNetTerms?.replace("_", " ")} · {lead.slaLabel || "Active"}
                              </span>
                            </div>
                          </div>
                        ) : isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setClientSubmitLead(lead)}
                            className="px-2 py-1 rounded-xl text-[10px] font-bold bg-orange-500/10 hover:bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>+ Client SLA</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[#0F172A] dark:text-white">Closer: {lead.closerName}</p>
                        <p className="font-mono text-[10px] text-[#94A3B8]">@{lead.agentUsername}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(lead.status)}`}>
                          ● {lead.status}
                        </span>
                        {lead.status === "CALL_BACK" && lead.callBackTime && (
                          <p className="font-mono text-[10px] text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(lead.callBackTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] line-clamp-1">{lead.address}</p>
                        {lead.notes && (
                          <p className="text-[10px] text-[#94A3B8] line-clamp-1 italic mt-0.5">&ldquo;{lead.notes}&rdquo;</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectLead(lead)}
                            title="Inspect Lead Details & History"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-[#64748B] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareLead(lead)}
                            title="Share Lead to Floor Pulse Chat"
                            className="p-1.5 rounded-lg hover:bg-orange-500/15 text-[#EA580C] dark:text-orange-400 cursor-pointer transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setClientSubmitLead(lead)}
                              title={lead.clientName ? `Reassign Client (${lead.clientName})` : "Submit Lead to Client Buyer"}
                              className="p-1.5 rounded-lg hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && lead.status !== "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleFastApprove(lead.id)}
                              title="Approve & Credit Incentive"
                              className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-[#059669] cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && lead.status !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => handleStartReject(lead)}
                              title="Reject Lead (Reason Required)"
                              className="p-1.5 rounded-lg hover:bg-red-500/15 text-[#EF4444] cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

      {/* Inspect Lead Modal */}
      {inspectLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
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

      {/* Client Submission & Net Terms Modal */}
      {clientSubmitLead && (
        <ClientSubmissionModal
          isOpen={true}
          onClose={() => setClientSubmitLead(null)}
          onSuccess={() => {
            setClientSubmitLead(null);
            onRefresh();
          }}
          leadId={clientSubmitLead.id}
          leadCustomerName={clientSubmitLead.customerName}
          currentClientName={clientSubmitLead.clientName}
          currentNetTerms={clientSubmitLead.clientNetTerms}
        />
      )}
    </div>
  );
}
