"use client";

import React from "react";
import {
  CheckCircle2,
  Clock,
  Users,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Moon,
  Minimize2,
  Maximize2,
  Layers,
  DollarSign,
  BarChart3,
  Check,
} from "lucide-react";
import { AnimatedGreeting, PageTransition } from "@/components/ui/visual-utils";
import { AdminWorkspaceTab } from "./AdminWorkspaceContainer";

export interface AdminDashboardClientProps {
  sessionName: string;
  activeTab: AdminWorkspaceTab;
  onTabChange: (tab: AdminWorkspaceTab) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export function AdminDashboardClient({
  sessionName,
  activeTab,
  onTabChange,
  isFocusMode,
  onToggleFocusMode,
}: AdminDashboardClientProps) {
  const cards: Array<{
    id: AdminWorkspaceTab;
    label: string;
    metric: string;
    subtitle: string;
    actionLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    activeBorder: string;
    badgeBg: string;
    badgeText: string;
  }> = [
    {
      id: "leads",
      label: "Leads Pipeline",
      metric: "Dual-View",
      subtitle: "Kanban & Virtualized Table",
      actionLabel: "Review Queue",
      icon: CheckCircle2,
      accentColor: "text-emerald-600 dark:text-emerald-400",
      activeBorder: "border-emerald-500",
      badgeBg: "bg-emerald-500/10",
      badgeText: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "attendance",
      label: "Floor Attendance",
      metric: "19:00 - 04:00",
      subtitle: "Shift Records & Auto Cutoff",
      actionLabel: "Live Floor Roster",
      icon: Moon,
      accentColor: "text-purple-600 dark:text-purple-400",
      activeBorder: "border-purple-500",
      badgeBg: "bg-purple-500/10",
      badgeText: "text-purple-600 dark:text-purple-400",
    },
    {
      id: "payroll",
      label: "Workforce & Payroll",
      metric: "Salaries & Teams",
      subtitle: "Monthly Ledgers & Banking",
      actionLabel: "Master Ledger",
      icon: Users,
      accentColor: "text-sky-600 dark:text-sky-400",
      activeBorder: "border-sky-500",
      badgeBg: "bg-sky-500/10",
      badgeText: "text-sky-600 dark:text-sky-400",
    },
    {
      id: "analytics",
      label: "Analytics & Timeline",
      metric: "Live Funnel",
      subtitle: "Conversion & Real-Time Events",
      actionLabel: "Floor Stream",
      icon: FileSpreadsheet,
      accentColor: "text-orange-600 dark:text-orange-400",
      activeBorder: "border-orange-500",
      badgeBg: "bg-orange-500/10",
      badgeText: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <PageTransition>
      {/* 1. Slim Executive Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-orange-200/70 dark:border-orange-500/30 text-[11px] font-bold text-[#EA580C] dark:text-[#FB923C] shadow-2xs backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-[#F97316]" />
              <span>Executive Command Center</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate hidden md:inline">
              1-click approve sales, review shifts, verify ledgers & track floor performance.
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] dark:text-white tracking-tight mt-1">
            Floor Operations & Leads Command Hub
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Focus Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isFocusMode
                ? "bg-orange-500 text-white border-orange-600 shadow-sm shadow-orange-500/30"
                : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-orange-500/50"
            }`}
            title={isFocusMode ? "Expand to Standard View with KPI cards" : "Collapse top cards into compact toolbar for maximum workspace height"}
          >
            {isFocusMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Standard View</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Focus Mode</span>
              </>
            )}
          </button>

          <AnimatedGreeting name={sessionName} />
        </div>
      </div>

      {/* 2. Interactive Command Controller (Expanded Cards or Collapsed Focus Bar) */}
      {!isFocusMode ? (
        /* Standard Mode: High-Density Interactive Cards (Serve as primary workspace tabs) */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const isActive = activeTab === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onTabChange(card.id)}
                className={`text-left p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer relative flex flex-col justify-between group select-none border ${
                  isActive
                    ? "bg-white dark:bg-slate-800/95 border-orange-500 shadow-md shadow-orange-500/10 ring-2 ring-orange-500/20 scale-[1.01]"
                    : "liquid-glass-card border-white/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100 hover:scale-[1.005]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                      {card.label}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg ${card.badgeBg} flex items-center justify-center ${card.accentColor} transition-transform group-hover:scale-105 shrink-0`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                    {card.metric}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {card.subtitle}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
                  {isActive ? (
                    <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                      <span>Active Workspace</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {card.actionLabel}
                    </span>
                  )}
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? "text-orange-500 translate-x-0.5" : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-600"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Focus Mode: Ultra-Slim 38px Segment Bar */
        <div className="liquid-glass p-1.5 rounded-xl border border-white/60 dark:border-slate-800 shadow-2xs mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {cards.map((card) => {
              const Icon = card.icon;
              const isActive = activeTab === card.id;

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onTabChange(card.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30 scale-[1.01]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-orange-500"}`} />
                  <span>{card.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden lg:inline-block pr-2">
            ⛶ Focus Mode Active
          </span>
        </div>
      )}
    </PageTransition>
  );
}
