"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Upload,
  CheckCircle2,
  XCircle,
  Coffee,
  LogIn,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getLiveTimelineAction, LiveTimelineEvent } from "@/app/actions/reports";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; lineColor: string }> = {
  lead_submit: { icon: Upload, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", lineColor: "border-blue-500/30" },
  lead_approve: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", lineColor: "border-emerald-500/30" },
  lead_reject: { icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", lineColor: "border-red-500/30" },
  break_start: { icon: Coffee, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", lineColor: "border-amber-500/30" },
  shift_login: { icon: LogIn, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", lineColor: "border-orange-500/30" },
  late_mark: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", lineColor: "border-red-500/30" },
  leave_apply: { icon: Calendar, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", lineColor: "border-purple-500/30" },
};

export function ActivityTimeline() {
  const [events, setEvents] = useState<LiveTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    getLiveTimelineAction()
      .then((data) => {
        setEvents(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const visibleEvents = isExpanded ? events : events.slice(0, 5);

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Live Floor Activity Timeline
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Real-time feed of shift operations and lead decisions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">LIVE</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
          Loading live floor activity...
        </div>
      ) : events.length === 0 ? (
        /* Clean Empty State - Zero Mock Data */
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white mb-1">
            No Floor Activity Yet
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-sm">
            Real-time operational activity will appear here dynamically as agents clock into shifts, record customer leads, and receive status decisions.
          </p>
        </div>
      ) : (
        /* Timeline */
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700" />

          <div className="space-y-0">
            {visibleEvents.map((event, idx) => {
              const config = typeConfig[event.type] || typeConfig.lead_submit;
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className="relative flex items-start gap-3 pl-0 py-2 animate-in fade-in slide-in-from-left-2 duration-300"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-slate-900 shadow-sm`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-white">{event.agent}</span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">{event.description}</span>
                      {event.campaign && (
                        <span className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-[9px] font-bold text-[#EA580C] dark:text-[#FB923C] border border-orange-500/15">
                          {event.campaign}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-[#94A3B8] dark:text-[#64748B] mt-0.5">{event.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expand/Collapse */}
      {events.length > 5 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-[#F97316] hover:bg-orange-500/5 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "Show Less" : `Show ${events.length - 5} More Events`}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

