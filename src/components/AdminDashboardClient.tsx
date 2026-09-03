"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Users, FileSpreadsheet, Sparkles } from "lucide-react";
import { AnimatedGreeting, PageTransition } from "@/components/ui/visual-utils";

export function AdminDashboardClient({ sessionName }: { sessionName: string }) {
  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-orange-200/70 dark:border-orange-500/30 text-xs font-bold text-[#EA580C] dark:text-[#FB923C] shadow-sm mb-2 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Sales Floor Operations & Decision Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Floor Operations & Leads Decision Queue
            </h1>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
              Daily command hub: Review incoming dialer transfers, 1-click approve sales, schedule callbacks, and monitor conversion metrics.
            </p>
          </div>
          <AnimatedGreeting name={sessionName} />
        </div>
      </div>

      {/* Quick Portal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="liquid-glass-card p-5 rounded-3xl animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Leads Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Dual-View</p>
          <p className="text-xs text-[#10B981] mt-1 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />
            Kanban & Table Live
          </p>
        </div>

        <Link href="/admin/settings#shifts" className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "75ms" }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Floor Shift
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316] group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">19:00 - 04:00</p>
          <p className="text-xs text-[#EA580C] dark:text-[#FB923C] mt-1 font-semibold group-hover:underline flex items-center gap-1">
            <span>Configure Shifts</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </p>
        </Link>

        <Link href="/admin/employees" className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Workforce Hub
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-[#0284C7] group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Staff Roster</p>
          <p className="text-xs text-[#0284C7] dark:text-[#38BDF8] mt-1 font-semibold group-hover:underline flex items-center gap-1">
            <span>Manage Staff & Breaks</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </p>
        </Link>

        <Link href="/admin/reports" className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "225ms" }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Performance
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-[#8B5CF6] group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Export CSV</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold group-hover:underline flex items-center gap-1">
            <span>Staff Reports & Downloads</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </p>
        </Link>
      </div>
    </PageTransition>
  );
}
