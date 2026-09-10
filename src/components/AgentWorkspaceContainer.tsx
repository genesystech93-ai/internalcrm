"use client";

import React, { useState } from "react";
import {
  Layers,
  Clock,
  CalendarCheck,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { ShiftControls } from "@/components/ShiftControls";
import { ShiftAttendanceBar } from "@/components/ShiftAttendanceBar";
import { AgentPerformanceDashboard } from "@/components/AgentPerformanceDashboard";
import { AgentIncentiveTracker } from "@/components/AgentIncentiveTracker";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { LeaveManagement } from "@/components/LeaveManagement";
import { AgentAttendanceAndSalaryView } from "@/components/AgentAttendanceAndSalaryView";

type AgentTab = "leads" | "shift" | "attendance_salary" | "performance" | "leaves";

export function AgentWorkspaceContainer({ sessionName }: { sessionName: string }) {
  const [activeTab, setActiveTab] = useState<AgentTab>("leads");

  const tabs: Array<{
    id: AgentTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    badge?: string;
  }> = [
    {
      id: "leads",
      label: "Leads & Deals Pipeline",
      icon: Layers,
      description: "Active calling queue, Kanban board, and conversion stages",
      badge: "Core",
    },
    {
      id: "shift",
      label: "Attendance & Shift Punch",
      icon: Clock,
      description: "Punch in/out, view shift breaks, misclick grace & auto-logout rules",
      badge: "Punch In",
    },
    {
      id: "attendance_salary",
      label: "Attendance History & Salary",
      icon: CalendarCheck,
      description: "Monthly shift logs, attendance compliance, and official payslip",
      badge: "Self-Service",
    },
    {
      id: "performance",
      label: "Targets & Commissions",
      icon: TrendingUp,
      description: "Deal conversion velocity, streaks & bonus incentives",
    },
    {
      id: "leaves",
      label: "Leave & Time-Off",
      icon: CalendarDays,
      description: "Planned vacation requests, sick days, and approval status",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Persistent Shift Attendance Punch & Status Hero Bar (Visible across all tabs) */}
      <div data-section="shift-controls">
        <ShiftAttendanceBar onNavigateToShiftTab={() => setActiveTab("shift")} />
      </div>

      {/* Corporate Workspace Tab Bar */}
      <div className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? "bg-[#F97316] text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#F97316]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C]"
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

      {/* Dynamic Tab Content Area */}
      <div className="min-h-[500px]">
        {activeTab === "leads" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <LeadWorkspace isAdmin={false} />
          </div>
        )}

        {activeTab === "shift" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <ShiftControls />
          </div>
        )}

        {activeTab === "attendance_salary" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <AgentAttendanceAndSalaryView />
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <AgentPerformanceDashboard />
            <AgentIncentiveTracker />
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <LeaveManagement isAdmin={false} />
          </div>
        )}
      </div>
    </div>
  );
}
