"use client";

import React, { useState, useEffect } from "react";
import { getFloorAttendanceAction } from "@/app/actions/attendance";
import { Clock, Coffee, User, RefreshCw } from "lucide-react";

interface FloorRecord {
  id: string;
  username: string;
  name: string;
  role: string;
  campaignName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  loginAt: string;
  logoutAt: string | null;
  status: string;
  isOnBreak: boolean;
  activeBreakType: string | null;
  totalBreakMinutes: number;
  netProductiveMinutes: number;
}

export function AdminAttendanceBoard() {
  const [records, setRecords] = useState<FloorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getFloorAttendanceAction();
      setRecords(data as FloorRecord[]);
    } catch {
      // Fallback
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  const loggedInCount = records.filter((r) => !r.logoutAt).length;
  const onBreakCount = records.filter((r) => r.isOnBreak).length;
  const lateCount = records.filter((r) => r.status === "LATE").length;

  const formatMinutes = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Floor Attendance & Live Shift Monitor
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Real-time tracking of staff log-in times, scheduled floor breaks, late marks, and net productive hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              ● {loggedInCount} On Duty
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              ☕ {onBreakCount} On Break
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
              ⚠️ {lateCount} Late
            </span>
          </div>

          <button
            type="button"
            onClick={fetchRecords}
            disabled={loading}
            className="liquid-glass-button-secondary p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer"
            title="Refresh Attendance Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Employee</th>
              <th className="py-3 px-3">Campaign & Shift</th>
              <th className="py-3 px-3">Log-In Time</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Break Status</th>
              <th className="py-3 px-3">Total Breaks</th>
              <th className="py-3 px-3 text-right">Net Productive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#94A3B8]">
                  No active shift records for today yet. Staff will appear here upon logging in.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8]">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] dark:text-white">{r.name}</p>
                        <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">@{r.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-semibold text-[#0F172A] dark:text-white">{r.campaignName}</p>
                    <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      {r.shiftStartTime} – {r.shiftEndTime}
                    </p>
                  </td>
                  <td className="py-3.5 px-3 font-mono">
                    {new Date(r.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === "LATE"
                          ? "bg-amber-500/15 text-[#D97706] border border-amber-500/30"
                          : "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      ● {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {r.isOnBreak ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30 inline-flex items-center gap-1 animate-pulse">
                        <Coffee className="w-3 h-3" />
                        <span>ON BREAK ({r.activeBreakType})</span>
                      </span>
                    ) : r.logoutAt ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-[#64748B] dark:text-[#94A3B8]">
                        Shift Ended
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#059669] dark:text-emerald-400">
                        Floor Active
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#64748B] dark:text-[#94A3B8]">
                    {r.totalBreakMinutes} mins
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-right text-[#0F172A] dark:text-white">
                    {formatMinutes(r.netProductiveMinutes)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
