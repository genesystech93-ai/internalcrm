"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getOperationalAnalyticsAction, AnalyticsData } from "@/app/actions/campaigns";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Trophy,
  Medal,
  Clock,
  Layers,
  PhoneCall,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCountUp, MiniSparkline, KPICardSkeleton } from "@/components/ui/visual-utils";

// Simulated 7-day trend data generator (seeded by current value for consistency)
function generateTrend(current: number, variance: number = 0.3): number[] {
  const days = 7;
  const result: number[] = [];
  for (let i = 0; i < days; i++) {
    const factor = 0.6 + (i / (days - 1)) * 0.4;
    const noise = 1 + Math.sin(current * 0.1 + i * 2.1) * variance;
    result.push(Math.max(0, Math.round(current * factor * noise)));
  }
  result[result.length - 1] = current;
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
  const animatedValue = useCountUp(value, 1000 + delay);

  return (
    <div
      className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 flex flex-col justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">
            {prefix}
            {prefix === "₹" ? animatedValue.toLocaleString("en-IN") : animatedValue}
            {suffix}
          </p>
          <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${subtextColor}`}>
            {subtextIcon}
            <span>{subtext}</span>
          </p>
        </div>
        <div className="shrink-0 pl-2">
          <MiniSparkline data={trendData} color={sparkColor} width={68} height={22} />
        </div>
      </div>
    </div>
  );
}

export function OperationalAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const res = await getOperationalAnalyticsAction();
      setData(res);
    } catch {
      // Offline fallback
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute Funnel Segment Percentages
  const funnelSegments = useMemo(() => {
    if (!data || data.totalLeads === 0) {
      return {
        approvedPct: 0,
        inReviewPct: 0,
        callbackPct: 0,
        voicemailPct: 0,
        rejectedPct: 0,
        inReviewCount: 0,
      };
    }
    const total = data.totalLeads;
    const inReviewCount = (data.uploadedCount || 0) + (data.pendingCount || 0);
    return {
      approvedPct: Math.round((data.approvedCount / total) * 100),
      inReviewPct: Math.round((inReviewCount / total) * 100),
      callbackPct: Math.round(((data.callbackCount || 0) / total) * 100),
      voicemailPct: Math.round(((data.voicemailCount || 0) / total) * 100),
      rejectedPct: Math.round(((data.rejectedCount || 0) / total) * 100),
      inReviewCount,
    };
  }, [data]);

  if (!data) {
    return (
      <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white">
              Floor Performance & Operational Funnel Command Center
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Loading real-time operational metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const rankMedals = ["🥇", "🥈", "🥉"];
  const sortedLeaderboard = [...data.leaderboard].sort((a, b) => b.approvedLeads - a.approvedLeads);

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-orange-500/5 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header & Quick Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FB923C] flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                Floor Performance & Operational Funnel Command Center
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Real-time conversion metrics, multi-stage lead distribution, channel attribution, and agent commission leaderboards.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isRefreshing}
            className="liquid-glass-button-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 6 High-Density Animated KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-7 relative z-10">
        {/* 1. Total Leads Ingested */}
        <AnimatedKPICard
          label="Total Leads Intake"
          value={data.totalLeads}
          subtext="Cross-campaign gross"
          subtextColor="text-[#64748B] dark:text-[#94A3B8]"
          trendData={generateTrend(data.totalLeads)}
          sparkColor="#3B82F6"
          iconBg="bg-blue-500/10"
          icon={BarChart3}
          iconColor="text-blue-500"
          delay={0}
        />

        {/* 2. Quality Approved */}
        <AnimatedKPICard
          label="Verified Approved"
          value={data.approvedCount}
          subtext={`${funnelSegments.approvedPct}% approval share`}
          subtextColor="text-[#059669] dark:text-emerald-400"
          subtextIcon={<CheckCircle2 className="w-3 h-3" />}
          trendData={generateTrend(data.approvedCount)}
          sparkColor="#10B981"
          iconBg="bg-emerald-500/10"
          icon={CheckCircle2}
          iconColor="text-[#10B981]"
          delay={75}
        />

        {/* 3. In-Review Pipeline */}
        <AnimatedKPICard
          label="In QA Review"
          value={funnelSegments.inReviewCount}
          subtext="Uploaded & Pending QA"
          subtextColor="text-[#0284C7] dark:text-sky-400"
          trendData={generateTrend(funnelSegments.inReviewCount)}
          sparkColor="#0284C7"
          iconBg="bg-sky-500/10"
          icon={Layers}
          iconColor="text-[#0284C7]"
          delay={150}
        />

        {/* 4. Scheduled Callbacks */}
        <AnimatedKPICard
          label="Callbacks Queue"
          value={data.callbackCount || 0}
          subtext="Customer re-contacts"
          subtextColor="text-purple-600 dark:text-purple-400"
          subtextIcon={<Clock className="w-3 h-3" />}
          trendData={generateTrend(data.callbackCount || 0)}
          sparkColor="#8B5CF6"
          iconBg="bg-purple-500/10"
          icon={PhoneCall}
          iconColor="text-purple-600 dark:text-purple-400"
          delay={225}
        />

        {/* 5. Floor Conversion Rate */}
        <AnimatedKPICard
          label="Conversion Rate"
          value={data.conversionRate}
          suffix="%"
          subtext="Approved / Intake"
          subtextColor="text-[#EA580C] dark:text-[#FB923C]"
          subtextIcon={<TrendingUp className="w-3 h-3" />}
          trendData={generateTrend(data.conversionRate, 0.2)}
          sparkColor="#F97316"
          iconBg="bg-orange-500/10"
          icon={TrendingUp}
          iconColor="text-[#F97316]"
          delay={300}
        />

        {/* 6. Commissions Accrued */}
        <AnimatedKPICard
          label="Commissions Paid"
          value={data.totalCommissionPaid}
          prefix="₹"
          subtext="Agent payroll credits"
          subtextColor="text-amber-600 dark:text-amber-400"
          subtextIcon={<Trophy className="w-3 h-3" />}
          trendData={generateTrend(data.totalCommissionPaid)}
          sparkColor="#D97706"
          iconBg="bg-amber-500/10"
          icon={Trophy}
          iconColor="text-[#D97706]"
          delay={375}
        />
      </div>

      {/* Visual Pipeline Funnel Health Distribution Track */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-white">
              Lead Pipeline Stage Distribution & Quality Health
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
            {data.totalLeads} Total Ingested Leads
          </span>
        </div>

        {/* Multi-segmented Funnel Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden flex shadow-inner mb-3">
          {data.totalLeads > 0 ? (
            <>
              {funnelSegments.approvedPct > 0 && (
                <div
                  style={{ width: `${funnelSegments.approvedPct}%` }}
                  className="h-full bg-emerald-500 transition-all duration-700 hover:opacity-90"
                  title={`Approved: ${data.approvedCount} (${funnelSegments.approvedPct}%)`}
                />
              )}
              {funnelSegments.inReviewPct > 0 && (
                <div
                  style={{ width: `${funnelSegments.inReviewPct}%` }}
                  className="h-full bg-sky-500 transition-all duration-700 hover:opacity-90"
                  title={`In Review: ${funnelSegments.inReviewCount} (${funnelSegments.inReviewPct}%)`}
                />
              )}
              {funnelSegments.callbackPct > 0 && (
                <div
                  style={{ width: `${funnelSegments.callbackPct}%` }}
                  className="h-full bg-purple-500 transition-all duration-700 hover:opacity-90"
                  title={`Callbacks: ${data.callbackCount} (${funnelSegments.callbackPct}%)`}
                />
              )}
              {funnelSegments.voicemailPct > 0 && (
                <div
                  style={{ width: `${funnelSegments.voicemailPct}%` }}
                  className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-700 hover:opacity-90"
                  title={`Voicemail: ${data.voicemailCount} (${funnelSegments.voicemailPct}%)`}
                />
              )}
              {funnelSegments.rejectedPct > 0 && (
                <div
                  style={{ width: `${funnelSegments.rejectedPct}%` }}
                  className="h-full bg-rose-500 transition-all duration-700 hover:opacity-90"
                  title={`Rejected: ${data.rejectedCount} (${funnelSegments.rejectedPct}%)`}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full bg-slate-300 dark:bg-slate-700" />
          )}
        </div>

        {/* Legend Pills with Counts & Percentages */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-[#475569] dark:text-[#CBD5E1]">Approved:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {data.approvedCount} ({funnelSegments.approvedPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="font-medium text-[#475569] dark:text-[#CBD5E1]">In Review:</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
              {funnelSegments.inReviewCount} ({funnelSegments.inReviewPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="font-medium text-[#475569] dark:text-[#CBD5E1]">Callbacks:</span>
            <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
              {data.callbackCount || 0} ({funnelSegments.callbackPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="font-medium text-[#475569] dark:text-[#CBD5E1]">Voicemail:</span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
              {data.voicemailCount || 0} ({funnelSegments.voicemailPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="font-medium text-[#475569] dark:text-[#CBD5E1]">Rejected:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
              {data.rejectedCount || 0} ({funnelSegments.rejectedPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Channel Attribution & Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Attribution with animated bars */}
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-500" />
                <span>Lead Source Channel Attribution</span>
              </h3>
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                Intake Efficiency
              </span>
            </div>

            <div className="space-y-3.5">
              {data.sourceBreakdown.map((s, idx) => (
                <div key={s.source}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-[#334155] dark:text-[#E2E8F0] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>{s.source}</span>
                    </span>
                    <span className="font-mono text-xs text-[#64748B] dark:text-[#94A3B8]">
                      <strong>{s.count}</strong> leads ({s.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/70 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[#F97316] transition-all duration-1000 ease-out"
                      style={{
                        width: `${s.percentage}%`,
                        transitionDelay: `${300 + idx * 100}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <span>Primary intake method: <strong>DIALER transfers</strong></span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Verified Quality</span>
          </div>
        </div>

        {/* Agent Leaderboard — Enhanced with rank medals and earnings */}
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white flex items-center gap-1.5">
                <Medal className="w-4 h-4 text-amber-500" />
                <span>Top Closer & Agent Leaderboard</span>
              </h3>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>

            <div className="space-y-2.5">
              {sortedLeaderboard.slice(0, 5).map((a, idx) => (
                <div
                  key={a.username}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs transition-all duration-300 ${
                    idx === 0
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 dark:border-amber-500/20 shadow-xs"
                      : "bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">
                      {idx < 3 ? (
                        rankMedals[idx]
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8] flex items-center justify-center text-[10px] font-bold mx-auto">
                          {idx + 1}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2.5">
                      {/* Avatar circle with initials */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                          idx === 0
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-slate-200 dark:bg-slate-700 text-[#475569] dark:text-[#CBD5E1]"
                        }`}
                      >
                        {a.agentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] dark:text-white leading-tight">
                          {a.agentName}
                        </p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                          @{a.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-extrabold text-[#059669] dark:text-emerald-400 font-mono text-xs">
                      {a.approvedLeads} Closed
                    </p>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono font-semibold">
                      ₹{a.totalEarnings.toLocaleString("en-IN")} Earned
                    </p>
                  </div>
                </div>
              ))}

              {sortedLeaderboard.length === 0 && (
                <p className="text-xs text-center text-[#94A3B8] py-6">No agent conversion records available yet.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <span>Rankings evaluated across verified closed sales</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">Bonus Eligible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
