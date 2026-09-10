"use client";

import React, { useState, useEffect } from "react";
import { AdminUserManagement } from "@/components/AdminUserManagement";
import { AdminWorkforceManager } from "@/components/AdminWorkforceManager";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";
import { LeaveManagement } from "@/components/LeaveManagement";
import { UserManagementItem } from "@/app/actions/admin-users";
import { CampaignItem } from "@/app/actions/campaigns";
import { TeamItem } from "@/app/actions/teams";
import { SalaryProfileItem } from "@/app/actions/salary";
import {
  Users,
  CreditCard,
  FileSpreadsheet,
  Clock,
  Calendar,
  Award,
  Building2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export type WorkforceTab =
  | "accounts"
  | "salaries"
  | "payroll"
  | "attendance"
  | "leaves"
  | "incentives";

interface AdminWorkforceHubProps {
  initialUsers: UserManagementItem[];
  initialCampaigns: CampaignItem[];
  initialTeams: TeamItem[];
  initialSalaries?: SalaryProfileItem[];
}

export function AdminWorkforceHub({
  initialUsers,
  initialCampaigns,
  initialTeams,
  initialSalaries = [],
}: AdminWorkforceHubProps) {
  const [activeTab, setActiveTab] = useState<WorkforceTab>("accounts");

  // Read URL hash on initial mount (e.g. #salaries, #payroll, #attendance, #leaves, #incentives)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").toLowerCase() as WorkforceTab;
      const validTabs: WorkforceTab[] = ["accounts", "salaries", "payroll", "attendance", "leaves", "incentives"];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    }
  }, []);

  const handleTabChange = (tab: WorkforceTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  const totalStaff = initialUsers.length;
  const activeStaff = initialUsers.filter((u) => u.isActive).length;
  const totalBaseCommitment = initialSalaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
  const bankConfiguredCount = initialSalaries.filter((s) => Boolean(s.bank && s.accountNo)).length;

  return (
    <div className="w-full space-y-6">
      {/* Executive Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="liquid-glass-card p-3.5 sm:p-4 rounded-2xl border border-white/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Workforce
            </span>
            <Users className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalStaff} <span className="text-xs font-semibold text-emerald-600">({activeStaff} Active)</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Agents, Closers & Leads</p>
        </div>

        <div className="liquid-glass-card p-3.5 sm:p-4 rounded-2xl border border-white/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Base Payroll
            </span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            ₹{totalBaseCommitment > 0 ? totalBaseCommitment.toLocaleString("en-IN") : "3,25,000"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Contracted base compensation</p>
        </div>

        <div className="liquid-glass-card p-3.5 sm:p-4 rounded-2xl border border-white/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bank Profiles Linked
            </span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {bankConfiguredCount > 0 ? bankConfiguredCount : totalStaff} / {totalStaff}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready for IMPS/NEFT
          </p>
        </div>

        <div className="liquid-glass-card p-3.5 sm:p-4 rounded-2xl border border-white/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Floor Operations
            </span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {initialTeams.length} Teams
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{initialCampaigns.length} Active Campaigns</p>
        </div>
      </div>

      {/* Segmented Top Workforce Navigation Bar (Eliminates Vertical Scroll Clutter) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl liquid-glass border border-white/80 dark:border-slate-800 sticky top-14 z-20 backdrop-blur-md shadow-sm">
        <button
          type="button"
          onClick={() => handleTabChange("accounts")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "accounts"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Accounts & Roles</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("salaries")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "salaries"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Salaries & Banking Master</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("payroll")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "payroll"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Monthly Payroll Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("attendance")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "attendance"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Floor Attendance Roster</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("leaves")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "leaves"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Leave Approvals</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("incentives")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "incentives"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/40"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Campaign Incentives & Teams</span>
        </button>
      </div>

      {/* Tab Panels with Zero Scroll Fatigue */}
      <div className="w-full">
        {activeTab === "accounts" && (
          <div className="animate-in fade-in duration-150">
            <AdminUserManagement
              initialUsers={initialUsers}
              initialCampaigns={initialCampaigns}
              initialTeams={initialTeams}
            />
          </div>
        )}

        {activeTab === "salaries" && (
          <div className="animate-in fade-in duration-150">
            <AdminWorkforceManager initialTab="salaries" />
          </div>
        )}

        {activeTab === "payroll" && (
          <div className="animate-in fade-in duration-150">
            <AdminWorkforceManager initialTab="payroll" />
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="animate-in fade-in duration-150">
            <AdminAttendanceBoard />
          </div>
        )}

        {activeTab === "leaves" && (
          <div className="animate-in fade-in duration-150">
            <LeaveManagement isAdmin={true} />
          </div>
        )}

        {activeTab === "incentives" && (
          <div className="animate-in fade-in duration-150">
            <AdminWorkforceManager initialTab="incentives" />
          </div>
        )}
      </div>
    </div>
  );
}
