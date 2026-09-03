"use client";

import React, { useState, useEffect } from "react";
import { getOperationalAnalyticsAction, AnalyticsData } from "@/app/actions/campaigns";
import { BarChart3, TrendingUp, CheckCircle2, Trophy } from "lucide-react";

export function OperationalAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    getOperationalAnalyticsAction().then((res) => setData(res));
  }, []);

  if (!data) return null;

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
            Floor Performance & Operational Funnel Analytics
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Real-time conversion rates, calling source breakdown, and agent commission leaderboards.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Total Leads Ingested</span>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white mt-1">{data.totalLeads}</p>
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Cross-campaign gross volume</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Quality Approved</span>
          <p className="text-2xl font-extrabold font-mono text-[#10B981] mt-1">{data.approvedCount}</p>
          <p className="text-[10px] text-[#10B981] mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Passed verification</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Conversion Rate</span>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white mt-1">{data.conversionRate}%</p>
          <p className="text-[10px] text-[#F97316] mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Approved / Total intake</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Commissions Paid</span>
          <p className="text-2xl font-extrabold font-mono text-[#EA580C] dark:text-[#FB923C] mt-1">
            ₹{data.totalCommissionPaid.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Automated payroll credits</p>
        </div>
      </div>

      {/* Two Column Section: Source Attribution & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Attribution */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white mb-3">
            Lead Source Channel Attribution
          </h3>
          <div className="space-y-3">
            {data.sourceBreakdown.map((s) => (
              <div key={s.source}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">{s.source}</span>
                  <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {s.count} leads ({s.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/50 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#F97316]"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Leaderboard */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
              Floor Performance Leaderboard
            </h3>
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
          </div>

          <div className="space-y-2.5">
            {data.leaderboard.map((a, idx) => (
              <div
                key={a.username}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx === 0
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-[#0F172A] dark:text-white">{a.agentName}</p>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">@{a.username}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-[#10B981] font-mono">{a.approvedLeads} Approved</p>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                    ₹{a.totalEarnings.toLocaleString("en-IN")} Earned
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
