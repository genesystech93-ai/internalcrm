"use client";

import React, { useState, useEffect } from "react";
import { getUserEarningsSummaryAction, UserEarningsSummary } from "@/app/actions/incentives";
import { Target, Flame, TrendingUp, Medal, Zap } from "lucide-react";
import { useCountUp, MiniSparkline } from "@/components/ui/visual-utils";

export function AgentPerformanceDashboard() {
  const [data, setData] = useState<UserEarningsSummary | null>(null);

  useEffect(() => {
    getUserEarningsSummaryAction().then((res) => setData(res));
  }, []);

  const submitted = data?.submittedLeadsCount || 0;
  const approved = data?.approvedLeadsCount || 0;
  const pending = data?.pendingLeadsCount || 0;
  const callbacks = data?.callbackLeadsCount || 0;
  const rejected = data?.rejectedLeadsCount || 0;

  const target = 25; // Daily target
  const dailyProgress = Math.min(100, Math.round((approved / target) * 100));
  const totalReviewed = approved + rejected;
  const approvalRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : (approved > 0 ? 100 : 0);
  const streak = approved;
  const rank = approved > 15 ? 1 : approved > 10 ? 2 : approved > 5 ? 3 : approved > 0 ? 4 : 0;

  const animatedSubmitted = useCountUp(submitted, 1000);
  const animatedApproved = useCountUp(approved, 1100);
  const animatedProgress = useCountUp(dailyProgress, 1200);
  const animatedRate = useCountUp(approvalRate, 1400);
  const animatedStreak = useCountUp(streak, 1000);

  if (!data) return null;

  const rankLabels = ["—", "🥇 #1", "🥈 #2", "🥉 #3", "#4"];

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-600">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#EA580C] dark:text-[#FB923C]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              My Performance & Pipeline Snapshot
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Live tracking of submitted leads, quality approval rate, and daily quota
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>{submitted} Submitted Total</span>
          </span>
          {pending > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              {pending} In Review
            </span>
          )}
        </div>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Submitted Leads & In-Flight Breakdown */}
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">My Submitted Leads</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Active
            </span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">
              {animatedSubmitted}
            </span>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-0.5">leads submitted</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{pending} pending</span>
            <span>•</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">{callbacks} callback</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{approved} approved</span>
          </div>
        </div>

        {/* Card 2: Approved Target Progress */}
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Daily Target</span>
            <Zap className="w-3.5 h-3.5 text-[#F97316]" />
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">{animatedApproved}</span>
            <span className="text-xs font-mono text-[#94A3B8] mb-0.5">/ {target} target</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-200/50 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] transition-all duration-1000 ease-out"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <p className="text-[10px] font-mono font-bold text-[#F97316] mt-1.5">{animatedProgress}% completed</p>
        </div>

        {/* Card 3: Quality Approval Rate — Donut-style */}
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Approval Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <div className="flex items-center gap-3">
            {/* SVG Donut */}
            <svg width="46" height="46" viewBox="0 0 48 48" className="flex-shrink-0">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
              <circle
                cx="24" cy="24" r="20" fill="none" stroke="#10B981" strokeWidth="4"
                strokeDasharray={`${(approvalRate / 100) * 125.6} 125.6`}
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
                className="transition-all duration-1000 ease-out"
              />
              <text x="24" y="26" textAnchor="middle" className="fill-[#0F172A] dark:fill-white text-[10px] font-bold" fontFamily="monospace">
                {animatedRate}%
              </text>
            </svg>
            <div>
              <p className="text-lg font-extrabold font-mono text-[#10B981]">{animatedRate}%</p>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Quality pass rate</p>
            </div>
          </div>
        </div>

        {/* Card 4: Current Streak & Floor Rank */}
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Hot Streak</span>
            <Flame className={`w-3.5 h-3.5 ${streak >= 3 ? "text-red-500 animate-pulse" : "text-[#94A3B8]"}`} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white flex items-center gap-1">
                {animatedStreak}
                {streak >= 5 && <span className="text-base">🔥</span>}
              </p>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {streak >= 5 ? "You're on fire!" : streak >= 3 ? "Consecutive approvals" : "Build your streak"}
              </p>
            </div>
            <div className="text-right pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] block uppercase">Rank</span>
              <span className="text-base font-extrabold text-[#0F172A] dark:text-white">
                {rank > 0 ? rankLabels[rank] : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
