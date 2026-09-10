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
    <div id="leads-workspace" className="w-full mb-3 scroll-mt-16">
      {/* Streamlined High-Density Workspace Header Strip */}
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-1.5">
            <span>{isAdmin ? "Lead Decisions & Audit Pipeline" : "My Active Leads"}</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20 shadow-2xs">
            {leads.length} Leads
          </span>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2">
          {/* New Lead Entry Trigger */}
          <button
            type="button"
            onClick={() => setIsEntryModalOpen(true)}
            className="liquid-glass-button-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            title="Fast Lead Entry (Ctrl+N)"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Lead (Ctrl+N)</span>
          </button>

          {/* 1-Click View Switcher (Kanban vs Table) */}
          <div className="flex items-center p-0.5 rounded-xl liquid-glass border border-white/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#F97316] text-white shadow-2xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#F97316] text-white shadow-2xs"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadLeads}
            disabled={loading}
            className="liquid-glass-button-secondary p-1.5 rounded-xl text-xs flex items-center justify-center cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-500" : ""}`} />
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
