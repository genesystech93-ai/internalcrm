"use client";

import React, { useState, useEffect } from "react";
import { getUserEarningsSummaryAction, UserEarningsSummary } from "@/app/actions/incentives";
import { DollarSign, TrendingUp, Award, CheckCircle2, Trophy, Sparkles } from "lucide-react";

export function AgentIncentiveTracker() {
  const [data, setData] = useState<UserEarningsSummary | null>(null);

  useEffect(() => {
    getUserEarningsSummaryAction().then((res) => setData(res));
  }, []);

  const total = data?.totalEarnings || 0;
  const approvedCount = data?.approvedLeadsCount || 0;
  const teamGoal = 200;
  const teamCurrent = 148;
  const teamPercent = Math.min(100, Math.round((teamCurrent / teamGoal) * 100));

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              My Real-Time Commission & Incentive Tracker
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Itemized commissions credited automatically upon Admin approval.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-extrabold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Projected Payout: ${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Metric Capsule Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Approved Leads</span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">{approvedCount}</p>
          <p className="text-[11px] text-[#10B981] mt-1 font-semibold">100% Quality Verified</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Individual Commissions</span>
            <Award className="w-4 h-4 text-[#F97316]" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">
            ${(data?.individualCommissions || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">Per-lead credited</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Team Milestone Pool</span>
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">
            ${(data?.teamPoolBonus || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-[#F59E0B] mt-1 font-semibold">Alpha Velocity Pool</p>
        </div>
      </div>

      {/* Team Milestone Progress Bar */}
      <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/15">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-[#9A3412] dark:text-orange-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Team Alpha Velocity: $500 Milestone Target</span>
          </span>
          <span className="font-mono font-extrabold text-[#C2410C] dark:text-orange-300">
            {teamCurrent} / {teamGoal} Approved ({teamPercent}%)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-orange-200/50 dark:bg-orange-950 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] transition-all duration-500"
            style={{ width: `${teamPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-[#9A3412] dark:text-orange-400 mt-2">
          52 more approved leads to unlock the $500 monthly team bonus pool for equal member distribution!
        </p>
      </div>
    </div>
  );
}
