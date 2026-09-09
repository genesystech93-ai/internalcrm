"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Users,
  FileSpreadsheet,
  Sparkles,
  Layers,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  Moon,
  ExternalLink,
} from "lucide-react";
import { AnimatedGreeting, PageTransition } from "@/components/ui/visual-utils";

export function AdminDashboardClient({ sessionName }: { sessionName: string }) {
  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-orange-200/70 dark:border-orange-500/30 text-xs font-bold text-[#EA580C] dark:text-[#FB923C] shadow-xs mb-2 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Sales Floor Operations & Executive Decision Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Floor Operations & Leads Command Hub
            </h1>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
              Daily operational command center: Review dialer intake, 1-click approve sales, delete obsolete records, manage shift timers, and track staff performance.
            </p>
          </div>
          <AnimatedGreeting name={sessionName} />
        </div>
      </div>

      {/* Executive Quick Portal KPI Command Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {/* Tile 1: Leads Pipeline */}
        <a
          href="#leads"
          className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500 border border-white/80 dark:border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Leads Pipeline
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981] group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Dual-View</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Kanban Board & Pretext Table
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#10B981] font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Review Queue</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </a>

        {/* Tile 2: Shift Schedule & Attendance */}
        <a
          href="#attendance"
          className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500 border border-white/80 dark:border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between"
          style={{ animationDelay: "75ms" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Floor Attendance
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Moon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">19:00 - 04:00</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Shift Records & Auto Cutoff
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
            <span>Workforce Shifts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </a>

        {/* Tile 3: Workforce & Payroll */}
        <a
          href="#payroll"
          className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500 border border-white/80 dark:border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between"
          style={{ animationDelay: "150ms" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Workforce & Payroll
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-[#0284C7] group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Salaries & Teams</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Monthly Ledgers & Banking
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#0284C7] dark:text-[#38BDF8] font-semibold">
            <span>Open Master Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </a>

        {/* Tile 4: Analytics & Live Timeline */}
        <a
          href="#analytics"
          className="liquid-glass-card p-5 rounded-3xl group cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-500 border border-white/80 dark:border-slate-800 hover:border-orange-500/40 transition-all flex flex-col justify-between"
          style={{ animationDelay: "225ms" }}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                Analytics & Timeline
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316] group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Live Funnel</p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              Conversion & Real-Time Events
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-[#EA580C] dark:text-[#FB923C] font-semibold">
            <span>View Floor Stream</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </a>
      </div>
    </PageTransition>
  );
}
