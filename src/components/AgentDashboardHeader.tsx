"use client";

import React from "react";
import { AnimatedGreeting, PageTransition } from "@/components/ui/visual-utils";
import { Sparkles } from "lucide-react";

export function AgentDashboardHeader({ sessionName }: { sessionName: string }) {
  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-orange-200/70 dark:border-orange-500/30 text-xs font-bold text-[#EA580C] dark:text-[#FB923C] shadow-sm mb-2 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>My Active Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              Agent Floor Dashboard
            </h1>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
              Log your shift, track commissions, manage leads, and communicate with the floor team.
            </p>
          </div>
          <AnimatedGreeting name={sessionName} />
        </div>
      </div>
    </PageTransition>
  );
}
