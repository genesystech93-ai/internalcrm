"use client";

import React from "react";
import { AnimatedGreeting, PageTransition } from "@/components/ui/visual-utils";
import { Briefcase } from "lucide-react";

export function AgentDashboardHeader({ sessionName }: { sessionName: string }) {
  return (
    <PageTransition>
      <div className="mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Operational Floor Workspace</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Agent Floor Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Log your shift, track commissions, manage leads, and communicate with the floor team.
            </p>
          </div>
          <AnimatedGreeting name={sessionName} />
        </div>
      </div>
    </PageTransition>
  );
}
