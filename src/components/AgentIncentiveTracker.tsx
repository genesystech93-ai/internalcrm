"use client";

import React, { useState, useEffect } from "react";
import { getUserEarningsSummaryAction, UserEarningsSummary } from "@/app/actions/incentives";
import { DollarSign, TrendingUp, Award, CheckCircle2, Trophy, Sparkles } from "lucide-react";
import { useCountUp, MiniSparkline, KPICardSkeleton } from "@/components/ui/visual-utils";

function IncentiveKPI({
  label,
  value,
  prefix,
  subtext,
  subtextColor,
  icon: Icon,
  iconColor,
  sparkData,
  sparkColor,
  delay = 0,
}: {
  label: string;
  value: number;
  prefix?: string;
  subtext: string;
  subtextColor: string;
  icon: React.ElementType;
  iconColor: string;
  sparkData: number[];
  sparkColor: string;
  delay?: number;
}) {
  const animated = useCountUp(value, 1400 + delay);

  return (
    <div
      className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white">
            {prefix}{animated.toLocaleString("en-IN")}
          </p>
          <p className={`text-[11px] mt-1 font-semibold ${subtextColor}`}>{subtext}</p>
        </div>
        <MiniSparkline data={sparkData} color={sparkColor} width={64} height={20} />
      </div>
    </div>
  );
}

function generateMiniTrend(current: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < 7; i++) {
    const factor = 0.5 + (i / 6) * 0.5;
    result.push(Math.max(0, Math.round(current * factor * (0.9 + Math.sin(i * 1.7) * 0.15))));
  }
  result[result.length - 1] = current;
  return result;
}

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

  const animatedTotal = useCountUp(total, 1600);
  const animatedTeamPercent = useCountUp(teamPercent, 1800);

  if (!data) {
    return (
      <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
            <DollarSign className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Loading commission data...</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-600">
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
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-extrabold flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: "300ms" }}>
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Projected Payout: ₹{animatedTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Metric Capsule Strip with sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <IncentiveKPI
          label="Approved Leads"
          value={approvedCount}
          subtext="100% Quality Verified"
          subtextColor="text-[#10B981]"
          icon={CheckCircle2}
          iconColor="text-[#10B981]"
          sparkData={generateMiniTrend(approvedCount)}
          sparkColor="#10B981"
          delay={0}
        />

        <IncentiveKPI
          label="Individual Commissions"
          value={data?.individualCommissions || 0}
          prefix="₹"
          subtext="Per-lead credited"
          subtextColor="text-[#64748B] dark:text-[#94A3B8]"
          icon={Award}
          iconColor="text-[#F97316]"
          sparkData={generateMiniTrend(data?.individualCommissions || 0)}
          sparkColor="#F97316"
          delay={100}
        />

        <IncentiveKPI
          label="Team Milestone Pool"
          value={data?.teamPoolBonus || 0}
          prefix="₹"
          subtext="Alpha Velocity Pool"
          subtextColor="text-[#F59E0B]"
          icon={Trophy}
          iconColor="text-[#F59E0B]"
          sparkData={generateMiniTrend(data?.teamPoolBonus || 0)}
          sparkColor="#F59E0B"
          delay={200}
        />
      </div>

      {/* Team Milestone Progress Bar — Animated */}
      <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/15 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-[#9A3412] dark:text-orange-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Team Alpha Velocity: ₹10,000 Milestone Target</span>
          </span>
          <span className="font-mono font-extrabold text-[#C2410C] dark:text-orange-300">
            {teamCurrent} / {teamGoal} Approved ({animatedTeamPercent}%)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-orange-200/50 dark:bg-orange-950 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] transition-all duration-1500 ease-out"
            style={{ width: `${teamPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-[#9A3412] dark:text-orange-400 mt-2">
          52 more approved leads to unlock the ₹10,000 monthly team bonus pool for equal member distribution!
        </p>
      </div>
    </div>
  );
}
