"use client";

import React, { useState } from "react";
import {
  Layers,
  Clock,
  CalendarCheck,
  TrendingUp,
  CalendarDays,
  Sparkles,
  PhoneCall,
  DollarSign,
} from "lucide-react";
import { ShiftControls } from "@/components/ShiftControls";
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
      label: "Floor Shift Controls",
      icon: Clock,
      description: "Shift clock in/out, active break manager & grace countdown",
    },
    {
      id: "attendance_salary",
      label: "My Attendance & Salary",
      icon: CalendarCheck,
      description: "Monthly shift history, present days, and official payslip",
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
    <div className="space-y-6">
      {/* Sleek Workspace Tab Bar */}
      <div className="liquid-glass p-2 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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

      {/* Dynamic Tab Content Area */}
      <div className="min-h-[500px]">
        {activeTab === "leads" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <LeadWorkspace isAdmin={false} />
          </div>
        )}

        {activeTab === "shift" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ShiftControls />
          </div>
        )}

        {activeTab === "attendance_salary" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AgentAttendanceAndSalaryView />
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <AgentPerformanceDashboard />
            <AgentIncentiveTracker />
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <LeaveManagement isAdmin={false} />
          </div>
        )}
      </div>
    </div>
  );
}
