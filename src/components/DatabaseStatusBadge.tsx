"use client";

import React, { useState, useEffect } from "react";
import {
  checkDatabaseHealthAction,
  DatabaseDiagnosticResult,
} from "@/app/actions/database-status";
import {
  Database,
  Activity,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { ModalPortal } from "@/components/ModalPortal";

export function DatabaseStatusBadge() {
  const [data, setData] = useState<DatabaseDiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const result = await checkDatabaseHealthAction();
      setData(result);
    } catch {
      setData({
        status: "DISCONNECTED",
        latencyMs: 0,
        host: "Supabase DB",
        port: "5432",
        database: "postgres",
        userMasked: "postgres",
        isPooler: true,
        tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
        lastChecked: new Date().toLocaleTimeString(),
        error: "Network unreachable or action failed.",
        recommendation: "Check database credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!data) return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    if (data.status === "CONNECTED") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    }
    if (data.status === "DEGRADED") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    }
    return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 animate-pulse";
  };

  const getDotColor = () => {
    if (!data) return "bg-slate-400";
    if (data.status === "CONNECTED") return "bg-emerald-500";
    if (data.status === "DEGRADED") return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <>
      {/* Clickable Status Pill in Header */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 ${getStatusColor()}`}
        title="Click to view Database Health & Connection Diagnostics"
      >
        <span className={`w-2 h-2 rounded-full ${getDotColor()}`} />
        <Database className="w-3 h-3" />
        <span className="hidden md:inline">
          {isLoading ? "Checking..." : data ? `${data.status === "CONNECTED" ? "DB Live" : data.status}` : "DB..."}
        </span>
        {data && data.status !== "DISCONNECTED" && (
          <span className="text-[10px] opacity-80 hidden lg:inline">
            ({data.latencyMs}ms)
          </span>
        )}
      </button>

      {/* Quick Diagnostics Pop-up Modal */}
      {isModalOpen && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  data?.status === "CONNECTED"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : data?.status === "DEGRADED"
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-red-500/15 text-red-600"
                }`}
              >
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2">
                  <span>Database Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusColor()}`}
                  >
                    {data?.status || "CHECKING"}
                  </span>
                </h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Supabase PostgreSQL Infrastructure Monitor
                </p>
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Latency Probe
                </span>
                <p className="text-lg font-extrabold font-mono text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span>{data ? `${data.latencyMs} ms` : "..."}</span>
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {data && data.latencyMs < 150 ? "Lightning Fast" : data && data.latencyMs < 500 ? "Normal" : "High Latency"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Pooler Type
                </span>
                <p className="text-sm font-extrabold text-[#0F172A] dark:text-white truncate">
                  {data?.isPooler ? "Supabase Pooler" : "Direct Connection"}
                </p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  IPv4 Session Mode
                </span>
              </div>
            </div>

            {/* Host & DB Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Host:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={data?.host}>
                  {data?.host}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Database:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{data?.database} (Port {data?.port})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Last Checked:</span>
                <span className="text-slate-700 dark:text-slate-300">{data?.lastChecked}</span>
              </div>
            </div>

            {/* Error & Recommendation Box if any */}
            {data?.status === "DISCONNECTED" && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs">
                <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Connection Issue Detected</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px] mb-2 break-words">
                  {data.error}
                </p>
                {data.recommendation && (
                  <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                    💡 Tip: {data.recommendation}
                  </p>
                )}
              </div>
            )}

            {data?.status === "CONNECTED" && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All database operations & queries are responding normally.</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={isLoading}
                className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>{isLoading ? "Testing Connection..." : "Test Ping Now"}</span>
              </button>

              <Link
                href="/admin/settings#database-health"
                onClick={() => setIsModalOpen(false)}
                className="liquid-glass-button-secondary py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                title="Open Complete Settings Monitor"
              >
                <span>Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
