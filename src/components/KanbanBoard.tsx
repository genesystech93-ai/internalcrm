"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Columns3,
  Layers,
  ArrowUpDown,
  Copy,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { shareLeadToChatAction } from "@/app/actions/messages";

interface KanbanBoardProps {
  leads: LeadItem[];
  isAdmin?: boolean;
  onRefresh: () => void;
}

export type ViewPreset = "ALL" | "ACTIVE" | "DECISIONS" | "COMPLETED";
export type CardDensity = "comfortable" | "compact";
export type SortOption = "newest" | "oldest" | "name_asc" | "sla_urgent";

const ALL_COLUMNS: { id: LeadStatus; label: string; shortLabel: string; color: string; badgeBg: string }[] = [
  { id: "UPLOADED", label: "Uploaded Queue", shortLabel: "Uploaded", color: "#3B82F6", badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { id: "PENDING_VERIFICATION", label: "Pending Verification", shortLabel: "Pending", color: "#F59E0B", badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { id: "CALL_BACK", label: "Call Backs", shortLabel: "Callbacks", color: "#8B5CF6", badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { id: "VOICEMAIL", label: "Voicemail", shortLabel: "Voicemail", color: "#64748B", badgeBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  { id: "APPROVED", label: "Approved (Verified)", shortLabel: "Approved", color: "#10B981", badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { id: "REJECTED", label: "Rejected", shortLabel: "Rejected", color: "#EF4444", badgeBg: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  { id: "CUSTOM", label: "Custom / In-Progress", shortLabel: "Custom", color: "#EC4899", badgeBg: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30" },
];

export function KanbanBoard({ leads, isAdmin = false, onRefresh }: KanbanBoardProps) {
  const [search, setSearch] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("ALL");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [viewPreset, setViewPreset] = useState<ViewPreset>("ALL");
  const [cardDensity, setCardDensity] = useState<CardDensity>("comfortable");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Column collapse/fold state
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  const trackRef = useRef<HTMLDivElement>(null);

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

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filter columns based on view preset
  const visibleColumns = useMemo(() => {
    if (viewPreset === "ACTIVE") {
      return ALL_COLUMNS.filter((c) =>
        ["UPLOADED", "PENDING_VERIFICATION", "CALL_BACK", "CUSTOM"].includes(c.id)
      );
    }
    if (viewPreset === "DECISIONS") {
      return ALL_COLUMNS.filter((c) =>
        ["PENDING_VERIFICATION", "APPROVED", "REJECTED"].includes(c.id)
      );
    }
    if (viewPreset === "COMPLETED") {
      return ALL_COLUMNS.filter((c) =>
        ["APPROVED", "REJECTED"].includes(c.id)
      );
    }
    return ALL_COLUMNS;
  }, [viewPreset]);

  // Real-time filtering and sorting of leads
  const filteredLeads = useMemo(() => {
    const list = leads.filter((l) => {
      const matchSearch =
        !search ||
        l.customerName.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        (l.closerName && l.closerName.toLowerCase().includes(search.toLowerCase())) ||
        (l.agentUsername && l.agentUsername.toLowerCase().includes(search.toLowerCase())) ||
        (l.notes && l.notes.toLowerCase().includes(search.toLowerCase())) ||
        (l.customStatusLabel && l.customStatusLabel.toLowerCase().includes(search.toLowerCase()));

      const matchCamp = selectedCampaign === "ALL" || l.campaignId === selectedCampaign;

      return matchSearch && matchCamp;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "name_asc") {
        return a.customerName.localeCompare(b.customerName);
      }
      if (sortBy === "sla_urgent") {
        // Overdue first, then closest to deadline
        const aVal = a.isOverdue ? -100 : (a.daysRemaining ?? 99);
        const bVal = b.isOverdue ? -100 : (b.daysRemaining ?? 99);
        return aVal - bVal;
      }
      return 0;
    });
  }, [leads, search, selectedCampaign, sortBy]);

  // Horizontal track scrolling helpers
  const scrollTrack = (direction: "left" | "right") => {
    if (trackRef.current) {
      const amount = direction === "left" ? -340 : 340;
      trackRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const scrollToColumn = (colId: string) => {
    const el = document.getElementById(`kanban-col-${colId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      // If collapsed, expand it
      if (collapsedColumns[colId]) {
        setCollapsedColumns((prev) => ({ ...prev, [colId]: false }));
      }
    }
  };

  const toggleCollapse = (colId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const autoCollapseEmpty = () => {
    const newCollapsed: Record<string, boolean> = {};
    visibleColumns.forEach((col) => {
      const count = filteredLeads.filter((l) => l.status === col.id).length;
      if (count === 0) {
        newCollapsed[col.id] = true;
      }
    });
    setCollapsedColumns(newCollapsed);
  };

  const expandAllColumns = () => {
    setCollapsedColumns({});
  };

  const handleCopyPhone = (leadId: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(leadId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

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

  const handleShareLead = async (lead: LeadItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleFastApprove = async (leadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setApprovingId(leadId);
    const res = await adminDecisionAction(leadId, "APPROVED");
    if (!res.error) {
      onRefresh();
    }
    setApprovingId(null);
  };

  const handleStartReject = (lead: LeadItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

    if (targetStatus === "CUSTOM") {
      setCustomStatusLead(lead);
      setCustomStatusInput(lead.customStatusLabel || "");
      return;
    }

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

    setSelectedLeadForDecision({
      leadId: lead.id,
      leadCustomerName: lead.customerName,
      mode: "RECLASSIFY",
      currentStatus: lead.status,
      targetStatus,
    });
  };

  const hasAnyCollapsed = Object.values(collapsedColumns).some(Boolean);

  return (
    <div className="w-full space-y-3">
      {/* Toast Notification when Lead is Shared to Chat */}
      {shareSuccess && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check className="w-4 h-4 text-white" />
          <span>{shareSuccess}</span>
        </div>
      )}

      {/* 1. Kanban Controls Toolbar */}
      <div className="liquid-glass-card rounded-2xl p-3 border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        {/* Top Control Line: Search, Campaign, View Presets & Quick Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Input & Campaign Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, phone, closer, notes..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-medium"
              />
            </div>

            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
            >
              <option value="ALL">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="hidden sm:flex items-center gap-1.5 pl-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                title="Sort order"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Customer A-Z</option>
                <option value="sla_urgent">SLA Urgency</option>
              </select>
            </div>
          </div>

          {/* View Preset Segmented Buttons & Density Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
            {/* View Presets */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewPreset("ALL")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewPreset === "ALL"
                    ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Show all 7 columns"
              >
                All (7)
              </button>
              <button
                type="button"
                onClick={() => setViewPreset("ACTIVE")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewPreset === "ACTIVE"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Active Funnel (Uploaded, Pending, Callbacks, Custom)"
              >
                Active Funnel (4)
              </button>
              <button
                type="button"
                onClick={() => setViewPreset("DECISIONS")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewPreset === "DECISIONS"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                title="Review & Decisions (Pending, Approved, Rejected)"
              >
                Decisions (3)
              </button>
            </div>

            {/* Density Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCardDensity("comfortable")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cardDensity === "comfortable"
                    ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                title="Comfortable card spacing"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setCardDensity("compact")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cardDensity === "compact"
                    ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                title="Compact density (more cards visible)"
              >
                Compact
              </button>
            </div>

            {/* Quick Folding & Horizontal Scroll Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={hasAnyCollapsed ? expandAllColumns : autoCollapseEmpty}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1 transition-colors"
                title={hasAnyCollapsed ? "Expand all folded columns" : "Collapse empty columns to save space"}
              >
                {hasAnyCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                <span className="hidden sm:inline">{hasAnyCollapsed ? "Expand All" : "Collapse Empty"}</span>
              </button>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => scrollTrack("left")}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTrack("right")}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Quick-Jump Stage Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
            Stages:
          </span>
          {ALL_COLUMNS.map((col) => {
            const count = filteredLeads.filter((l) => l.status === col.id).length;
            const isVisible = visibleColumns.some((vc) => vc.id === col.id);
            const isCollapsed = !!collapsedColumns[col.id];

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => scrollToColumn(col.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                  !isVisible
                    ? "opacity-40 bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800"
                    : isCollapsed
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-dashed border-slate-300 dark:border-slate-700"
                    : "bg-white/80 dark:bg-slate-800/80 hover:bg-white text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
                }`}
                title={`Jump to ${col.label} (${count} leads)`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span>{col.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${
                    count > 0 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Responsive Kanban Horizontal Scrollable Track */}
      <div
        ref={trackRef}
        className="flex gap-3.5 overflow-x-auto pb-6 pt-1 items-start min-h-[580px] custom-scrollbar scroll-smooth"
      >
        {visibleColumns.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.id);
          const isCollapsed = !!collapsedColumns[col.id];

          // Collapsed Slim Vertical Ribbon
          if (isCollapsed) {
            return (
              <div
                key={col.id}
                id={`kanban-col-${col.id}`}
                onClick={() => toggleCollapse(col.id)}
                className="w-[48px] min-w-[48px] shrink-0 liquid-glass rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/50 transition-all flex flex-col items-center py-4 cursor-pointer min-h-[540px] group bg-slate-50/50 dark:bg-slate-900/50 select-none"
                title={`Click to expand ${col.label} (${colLeads.length} leads)`}
              >
                <span className="w-2.5 h-2.5 rounded-full mb-3 shrink-0" style={{ backgroundColor: col.color }} />
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold mb-4 ${col.badgeBg}`}>
                  {colLeads.length}
                </span>
                <div
                  className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 group-hover:text-orange-500 transition-colors whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {col.label}
                </div>
                <div className="mt-auto text-slate-400 group-hover:text-orange-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          }

          // Full Adjusted Column View
          const colWidthClass =
            cardDensity === "compact"
              ? "w-[260px] min-w-[250px]"
              : "w-[290px] min-w-[280px] sm:w-[305px]";

          return (
            <div
              key={col.id}
              id={`kanban-col-${col.id}`}
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
              className={`${colWidthClass} shrink-0 liquid-glass rounded-2xl p-3 border transition-all duration-200 flex flex-col min-h-[540px] ${
                dragOverColumn === col.id
                  ? "border-orange-500/80 bg-orange-500/10 shadow-lg ring-2 ring-orange-500/30 scale-[1.01]"
                  : "border-white/80 dark:border-slate-800/90 shadow-sm"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                  <h3 className="text-xs font-extrabold text-[#0F172A] dark:text-white uppercase tracking-wider truncate">
                    {col.label}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold border ${col.badgeBg}`}>
                    {colLeads.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(col.id)}
                    className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Collapse column"
                  >
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Cards Track */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[660px] pr-1 custom-scrollbar">
                {colLeads.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-[11px] text-[#94A3B8] border border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900/30">
                    <p className="font-medium">No leads in this stage</p>
                    <p className="text-[10px] opacity-70 mt-0.5">Drag cards here</p>
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
                      onClick={() => setInspectLead(lead)}
                      className={`liquid-glass-card rounded-xl border border-white/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-orange-400/60 dark:hover:border-orange-500/60 transition-all group relative cursor-pointer ${
                        cardDensity === "compact" ? "p-2.5" : "p-3"
                      } ${draggedLeadId === lead.id ? "opacity-35 border-dashed border-orange-400 scale-[0.98]" : ""}`}
                    >
                      {/* Top Header: Customer Name, Campaign Badge & Drag Grip */}
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-extrabold text-xs sm:text-sm text-[#0F172A] dark:text-white hover:text-[#F97316] dark:hover:text-[#FB923C] truncate cursor-pointer leading-snug"
                            title={lead.customerName}
                          >
                            {lead.customerName}
                          </h4>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 truncate max-w-full">
                            {lead.campaignName || "General Floor"}
                          </span>
                        </div>

                        <div
                          className="p-1 rounded text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                          title="Drag to reposition lead"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Lead Details: Mobile, Closer & SLA */}
                      <div className="space-y-1 text-xs mb-2">
                        {/* Phone Number with 1-Click Copy */}
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono font-bold text-[11px] text-[#0F172A] dark:text-white">
                              {lead.mobile}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(lead.id, lead.mobile, e)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Phone Number"
                          >
                            {copiedPhoneId === lead.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Closer / Self-Closed */}
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
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
                          <div className="flex items-center justify-between gap-1 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                              {lead.clientName}
                            </span>
                            <span
                              className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                                lead.isOverdue
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse"
                                  : (lead.daysRemaining ?? 10) <= 2
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              }`}
                            >
                              {lead.clientNetTerms?.replace("_", " ")} · {lead.slaLabel || "Active"}
                            </span>
                          </div>
                        )}

                        {/* Status Highlights */}
                        {lead.status === "CALL_BACK" && lead.callBackTime && (
                          <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-semibold text-[10px] bg-purple-500/10 px-2 py-0.5 rounded">
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

                        {lead.status === "CUSTOM" && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomStatusLead(lead);
                              setCustomStatusInput(lead.customStatusLabel || "");
                            }}
                            className="flex items-center justify-between text-pink-700 dark:text-pink-300 font-bold text-[10px] bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 rounded hover:bg-pink-500/25 transition-colors cursor-pointer"
                            title="Click to edit custom status"
                          >
                            <span className="truncate">✨ {lead.customStatusLabel || "Custom Status"}</span>
                            <span className="text-[9px] opacity-70 underline ml-1">edit</span>
                          </div>
                        )}

                        {lead.status === "REJECTED" && lead.rejectionReason && (
                          <div className="text-red-600 dark:text-red-400 text-[10px] bg-red-500/10 px-2 py-0.5 rounded font-medium truncate" title={lead.rejectionReason}>
                            ⚠️ {lead.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Tier 1 (Attribution) & Tier 2 (Actions) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5"
                      >
                        {/* Attribution line */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="truncate max-w-[130px]">@{lead.agentUsername}</span>
                          <span>{new Date(lead.createdAt).toLocaleDateString([], { month: "numeric", day: "numeric" })}</span>
                        </div>

                        {/* Action controls toolbar */}
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectLead(lead)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-500/10 hover:bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 flex items-center gap-1 cursor-pointer transition-all shrink-0"
                            title="Open full Lead Info"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Info</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Share to Chat */}
                            <button
                              type="button"
                              onClick={(e) => handleShareLead(lead, e)}
                              disabled={sharingId === lead.id}
                              title="Share Lead to Floor Pulse Chat"
                              className="p-1 rounded hover:bg-orange-500/15 text-[#EA580C] dark:text-orange-400 cursor-pointer transition-colors disabled:opacity-60"
                            >
                              {sharingId === lead.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[#EA580C]" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Admin Decision Quick Actions */}
                            {isAdmin && (
                              <>
                                {lead.status !== "APPROVED" && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleFastApprove(lead.id, e)}
                                    disabled={approvingId === lead.id}
                                    title="1-Click Approve Lead"
                                    className="p-1 rounded hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-pointer disabled:opacity-60"
                                  >
                                    {approvingId === lead.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}

                                {lead.status !== "REJECTED" && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleStartReject(lead, e)}
                                    title="Reject Lead"
                                    className="p-1 rounded hover:bg-red-500/15 text-red-500 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <select
                                  value={lead.status}
                                  onChange={(e) => handleMoveStatus(lead, e.target.value as LeadStatus)}
                                  className="text-[10px] py-0.5 px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer max-w-[72px]"
                                  title="Change Stage"
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
                                  title="Delete Lead"
                                  className="p-1 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
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

      {/* 3. Rejection / Reclassification Justification Modal */}
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

      {/* 4. Unified High-Contrast Lead Details Modal */}
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

      {/* 5. Delete Confirmation Modal */}
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

      {/* 6. Custom Status Prompt Modal */}
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
