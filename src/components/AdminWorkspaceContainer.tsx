"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Clock,
  DollarSign,
  BarChart3,
  Sparkles,
  Users,
  CheckCircle2,
  TrendingUp,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";
import { AdminWorkforceManager } from "@/components/AdminWorkforceManager";
import { OperationalAnalytics } from "@/components/OperationalAnalytics";
import { ActivityTimeline } from "@/components/ActivityTimeline";

export type AdminWorkspaceTab = "leads" | "attendance" | "payroll" | "analytics";

interface AdminWorkspaceContainerProps {
  initialTab?: AdminWorkspaceTab;
}

export function AdminWorkspaceContainer({ initialTab = "leads" }: AdminWorkspaceContainerProps) {
  const [activeTab, setActiveTab] = useState<AdminWorkspaceTab>(initialTab);

  // Sync hash if present and listen for changes
  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "");
        if (["leads", "attendance", "payroll", "analytics"].includes(hash)) {
          setActiveTab(hash as AdminWorkspaceTab);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tabId: AdminWorkspaceTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.location.hash = tabId;
    }
  };

  const tabs: Array<{
    id: AdminWorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
  }> = [
    {
      id: "leads",
      label: "Pipeline & Leads Queue",
      icon: Layers,
      description: "Dual-view Kanban & Virtualized Pretext Grid, Custom Statuses & Reclassification",
      badge: "Priority Queue",
    },
    {
      id: "attendance",
      label: "Workforce Attendance & Shifts",
      icon: Clock,
      description: "Single Employee Drilldown, Month Filtering, Auto 4AM Shift Cutoff & Headcounts",
      badge: "Live Floor",
    },
    {
      id: "payroll",
      label: "Payroll, Salaries & Banking",
      icon: DollarSign,
      description: "Single Employee & Monthly Ledger, Base Pay, Self-Closed Incentives & Bank Details",
      badge: "Master Ledger",
    },
    {
      id: "analytics",
      label: "Operational Analytics & Live Stream",
      icon: BarChart3,
      description: "Conversion funnels, agent performance benchmarks & real-time floor audit timeline",
      badge: "Intelligence",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Selector Bar (Liquid Glass Design) */}
      <div className="liquid-glass p-2.5 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/30 scale-[1.01]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-orange-500"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tab Workspace Container */}
      <div className="min-h-[600px]">
        {activeTab === "leads" && (
          <div id="leads-workspace" className="space-y-6 animate-in fade-in duration-200">
            <LeadWorkspace isAdmin={true} />
          </div>
        )}

        {activeTab === "attendance" && (
          <div id="attendance-workspace" className="space-y-6 animate-in fade-in duration-200">
            <AdminAttendanceBoard />
          </div>
        )}

        {activeTab === "payroll" && (
          <div id="payroll-workspace" className="space-y-6 animate-in fade-in duration-200">
            <AdminWorkforceManager initialTab="salaries" />
          </div>
        )}

        {activeTab === "analytics" && (
          <div id="analytics-workspace" className="space-y-8 animate-in fade-in duration-200">
            <OperationalAnalytics />
            <ActivityTimeline />
          </div>
        )}
      </div>
    </div>
  );
}
