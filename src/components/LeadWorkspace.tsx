"use client";

import React, { useState, useEffect } from "react";
import { getLeadsAction, LeadItem } from "@/app/actions/leads";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadTable } from "@/components/LeadTable";
import { LeadEntryModal } from "@/components/LeadEntryModal";
import { LayoutGrid, Table as TableIcon, PlusCircle, RefreshCw } from "lucide-react";

interface LeadWorkspaceProps {
  isAdmin?: boolean;
}

export function LeadWorkspace({ isAdmin = false }: LeadWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeadsAction();
      setLeads(data);
    } catch {
      // Fallback
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Global Ctrl+N hotkey to trigger Fast Lead Entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsEntryModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="w-full mb-8">
      {/* Workspace Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {isAdmin ? "Lead Decision & Quality Audit Pipeline" : "My Active Leads & Pipeline"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
              {leads.length} Leads
            </span>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {isAdmin
              ? "Dual-view audit pipeline: 1-click Approve, Reject with mandatory reason, or reclassify leads."
              : "Track your transfer submissions, scheduled callbacks, and approval status."}
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* New Lead Entry Trigger */}
          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
            title="Fast Lead Entry (Ctrl+N)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Lead Entry (Ctrl+N)</span>
          </button>

          {/* 1-Click View Switcher (Kanban vs Table) */}
          <div className="flex items-center p-1 rounded-xl liquid-glass border border-white/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="liquid-glass-button-secondary p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "kanban" ? (
        <KanbanBoard leads={leads} isAdmin={isAdmin} onRefresh={loadLeads} />
      ) : (
        <LeadTable leads={leads} isAdmin={isAdmin} onRefresh={loadLeads} />
      )}

      {/* Fast Lead Entry Modal */}
      <LeadEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={loadLeads}
      />
    </div>
  );
}
