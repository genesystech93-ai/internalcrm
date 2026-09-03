"use client";

import React, { useState, useEffect } from "react";
import { getOperationalAnalyticsAction, AnalyticsData } from "@/app/actions/campaigns";
import { BarChart3, TrendingUp, CheckCircle2, Trophy, Medal } from "lucide-react";
import { useCountUp, MiniSparkline, KPICardSkeleton } from "@/components/ui/visual-utils";

// Simulated 7-day trend data generator (seeded by current value for consistency)
function generateTrend(current: number, variance: number = 0.3): number[] {
  const days = 7;
  const result: number[] = [];
  for (let i = 0; i < days; i++) {
    const factor = 0.6 + (i / (days - 1)) * 0.4; // Trending upward
    const noise = 1 + (Math.sin(current * 0.1 + i * 2.1) * variance);
    result.push(Math.max(0, Math.round(current * factor * noise)));
  }
  result[result.length - 1] = current; // Ensure latest matches real data
  return result;
}

// Animated KPI Card component
function AnimatedKPICard({
  label,
  value,
  prefix = "",
  suffix = "",
  subtext,
  subtextColor,
  subtextIcon,
  trendData,
  sparkColor,
  iconBg,
  icon: Icon,
  iconColor,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtext: string;
  subtextColor: string;
  subtextIcon?: React.ReactNode;
  trendData: number[];
  sparkColor: string;
  iconBg: string;
  icon: React.ElementType;
  iconColor: string;
  delay?: number;
}) {
  const animatedValue = useCountUp(value, 1200 + delay);

  return (
    <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white mt-1">
            {prefix}{prefix === "₹" ? animatedValue.toLocaleString("en-IN") : animatedValue}{suffix}
          </p>
          <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${subtextColor}`}>
            {subtextIcon}
            <span>{subtext}</span>
          </p>
        </div>
        <MiniSparkline data={trendData} color={sparkColor} width={72} height={22} />
      </div>
    </div>
  );
}

export function OperationalAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    getOperationalAnalyticsAction().then((res) => setData(res));
  }, []);

  if (!data) {
    return (
      <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Floor Performance & Operational Funnel Analytics
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Loading real-time metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const rankMedals = ["🥇", "🥈", "🥉"];
  const sortedLeaderboard = [...data.leaderboard].sort((a, b) => b.approvedLeads - a.approvedLeads);

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-600">
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

      {/* KPI Cards Grid — with animated counters and sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatedKPICard
          label="Total Leads Ingested"
          value={data.totalLeads}
          subtext="Cross-campaign gross volume"
          subtextColor="text-[#64748B] dark:text-[#94A3B8]"
          trendData={generateTrend(data.totalLeads)}
          sparkColor="#3B82F6"
          iconBg="bg-blue-500/10"
          icon={BarChart3}
          iconColor="text-blue-500"
          delay={0}
        />

        <AnimatedKPICard
          label="Quality Approved"
          value={data.approvedCount}
          subtext="Passed verification"
          subtextColor="text-[#10B981]"
          subtextIcon={<CheckCircle2 className="w-3 h-3" />}
          trendData={generateTrend(data.approvedCount)}
          sparkColor="#10B981"
          iconBg="bg-emerald-500/10"
          icon={CheckCircle2}
          iconColor="text-[#10B981]"
          delay={100}
        />

        <AnimatedKPICard
          label="Conversion Rate"
          value={data.conversionRate}
          suffix="%"
          subtext="Approved / Total intake"
          subtextColor="text-[#F97316]"
          subtextIcon={<TrendingUp className="w-3 h-3" />}
          trendData={generateTrend(data.conversionRate, 0.2)}
          sparkColor="#F97316"
          iconBg="bg-orange-500/10"
          icon={TrendingUp}
          iconColor="text-[#F97316]"
          delay={200}
        />

        <AnimatedKPICard
          label="Commissions Paid"
          value={data.totalCommissionPaid}
          prefix="₹"
          subtext="Automated payroll credits"
          subtextColor="text-[#EA580C] dark:text-[#FB923C]"
          trendData={generateTrend(data.totalCommissionPaid)}
          sparkColor="#EA580C"
          iconBg="bg-orange-500/10"
          icon={Trophy}
          iconColor="text-[#EA580C]"
          delay={300}
        />
      </div>

      {/* Two Column Section: Source Attribution & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Attribution with animated bars */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-left-3 duration-600" style={{ animationDelay: "200ms" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white mb-3">
            Lead Source Channel Attribution
          </h3>
          <div className="space-y-3">
            {data.sourceBreakdown.map((s, idx) => (
              <div key={s.source}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">{s.source}</span>
                  <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {s.count} leads ({s.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/50 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FB923C] to-[#F97316] transition-all duration-1000 ease-out"
                    style={{
                      width: `${s.percentage}%`,
                      transitionDelay: `${400 + idx * 150}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Leaderboard — Enhanced with rank medals and better visuals */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-right-3 duration-600" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-[#F59E0B]" />
              Floor Performance Leaderboard
            </h3>
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
          </div>

          <div className="space-y-2.5">
            {sortedLeaderboard.slice(0, 5).map((a, idx) => (
              <div
                key={a.username}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all duration-300 animate-in fade-in slide-in-from-right-2 ${
                  idx === 0
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 dark:border-amber-500/20 shadow-sm"
                    : "bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
                }`}
                style={{ animationDelay: `${400 + idx * 100}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base w-6 text-center">
                    {idx < 3 ? rankMedals[idx] : (
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8] flex items-center justify-center text-[10px] font-bold mx-auto">
                        {idx + 1}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Avatar circle with initials */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      idx === 0 ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-[#475569] dark:text-[#CBD5E1]"
                    }`}>
                      {a.agentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#0F172A] dark:text-white">{a.agentName}</p>
                      <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">@{a.username}</p>
                    </div>
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

            {sortedLeaderboard.length === 0 && (
              <p className="text-xs text-center text-[#94A3B8] py-4">No agent data available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
