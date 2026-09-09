"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getAttendanceDashboardSummaryAction,
  updateAutoShiftEndTimeAction,
  AttendanceDashboardSummary,
} from "@/app/actions/attendance";
import {
  Clock,
  Coffee,
  User,
  Users,
  RefreshCw,
  Moon,
  CalendarCheck2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Download,
  Search,
  Check,
  X,
  Loader2,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export function AdminAttendanceBoard() {
  const [summary, setSummary] = useState<AttendanceDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"roster" | "live" | "history">("roster");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");

  // Single Employee & Single Month Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  // Edit Shift Times Modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editStartTime, setEditStartTime] = useState<string>("19:00");
  const [editEndTime, setEditEndTime] = useState<string>("04:00");
  const [editGraceMins, setEditGraceMins] = useState<number>(15);
  const [isSavingTimes, setIsSavingTimes] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDashboardSummary = async (emp = selectedEmployee, mth = selectedMonth) => {
    setLoading(true);
    try {
      const data = await getAttendanceDashboardSummaryAction(emp, mth);
      setSummary(data);
      if (data?.globalShiftStartTime) setEditStartTime(data.globalShiftStartTime);
      if (data?.globalShiftEndTime) setEditEndTime(data.globalShiftEndTime);
    } catch {
      // Fallback
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardSummary(selectedEmployee, selectedMonth);
    const interval = setInterval(() => fetchDashboardSummary(selectedEmployee, selectedMonth), 30000);
    return () => clearInterval(interval);
  }, [selectedEmployee, selectedMonth]);

  const formatMinutes = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  // Handle Save Shift Times
  const handleSaveShiftTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTimes(true);
    setToastMessage(null);

    const res = await updateAutoShiftEndTimeAction(editEndTime, editStartTime, editGraceMins);
    if (res.error) {
      setToastMessage({ text: res.error, type: "error" });
    } else {
      setToastMessage({
        text: res.message || `Auto Shift End Time set to ${editEndTime}. Shift roster updated!`,
        type: "success",
      });
      setShowEditModal(false);
      await fetchDashboardSummary();
    }
    setIsSavingTimes(false);
  };

  // CSV Export: Staff Attendance Totals & Roster
  const exportStaffToCSV = () => {
    if (!summary?.staffSummaries?.length) return;
    const headers = [
      "Employee Name",
      "Username",
      "Role",
      "Assigned Team",
      "Present Days",
      "Half Days",
      "Absent Days",
      "Late Marks",
      "Total Productive Hours",
      "Current Status",
      "Last Login",
      "Last Logout",
    ];

    const rows = summary.staffSummaries.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.username}"`,
      `"${s.role}"`,
      `"${s.teamName}"`,
      s.presentDays,
      s.halfDays,
      s.absentDays,
      s.lateMarks,
      s.totalShiftHours,
      `"${s.currentShiftStatus}"`,
      `"${s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : "N/A"}"`,
      `"${s.lastLogoutAt ? new Date(s.lastLogoutAt).toLocaleString() : "N/A"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Attendance_Totals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export: Recent Shift Logs
  const exportLogsToCSV = () => {
    if (!summary?.recentShiftLogs?.length) return;
    const headers = [
      "Shift Date",
      "Employee Name",
      "Username",
      "Role",
      "Campaign",
      "Login Time",
      "Logout Time",
      "Status",
      "Break Minutes",
      "Net Productive Minutes",
    ];

    const rows = summary.recentShiftLogs.map((r) => [
      `"${r.shiftDate}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.username}"`,
      `"${r.role}"`,
      `"${r.campaignName}"`,
      `"${new Date(r.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}"`,
      `"${r.logoutAt ? new Date(r.logoutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active / Floor"}"`,
      `"${r.status}"`,
      r.totalBreakMinutes,
      r.netProductiveMinutes,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Shift_Attendance_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Staff Summaries
  const filteredStaff = useMemo(() => {
    if (!summary?.staffSummaries) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return summary.staffSummaries;
    return summary.staffSummaries.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.teamName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
    );
  }, [summary?.staffSummaries, searchQuery]);

  // Filtered Live Floor Records
  const filteredLiveRecords = useMemo(() => {
    if (!summary?.recentShiftLogs) return [];
    const q = searchQuery.toLowerCase().trim();
    const live = summary.recentShiftLogs.filter((r) => !r.logoutAt);
    if (!q) return live;
    return live.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.campaignName.toLowerCase().includes(q)
    );
  }, [summary?.recentShiftLogs, searchQuery]);

  // Filtered History Records
  const filteredHistory = useMemo(() => {
    if (!summary?.recentShiftLogs) return [];
    let list = summary.recentShiftLogs;
    if (historyStatusFilter !== "ALL") {
      list = list.filter((r) => r.status === historyStatusFilter);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.campaignName.toLowerCase().includes(q) ||
        r.shiftDate.includes(q)
    );
  }, [summary?.recentShiftLogs, historyStatusFilter, searchQuery]);

  // Totals calculations across staff roster
  const staffTotals = useMemo(() => {
    if (!summary?.staffSummaries?.length) {
      return { present: 0, half: 0, absent: 0, late: 0, hours: 0 };
    }
    return summary.staffSummaries.reduce(
      (acc, s) => ({
        present: acc.present + s.presentDays,
        half: acc.half + s.halfDays,
        absent: acc.absent + s.absentDays,
        late: acc.late + s.lateMarks,
        hours: acc.hours + s.totalShiftHours,
      }),
      { present: 0, half: 0, absent: 0, late: 0, hours: 0 }
    );
  }, [summary?.staffSummaries]);

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 shadow-xl relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Master Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-7 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FB923C] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                  Workforce Attendance & Shift Operations
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Live & August Ingested
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Real-time tracking of staff log-in times, scheduled breaks, late marks, total shift attendance, and automatic shift conclusion.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Shift Time Badge with Edit Button */}
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="liquid-glass px-3.5 py-2 rounded-2xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 text-purple-800 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-all text-xs font-bold shadow-sm group"
            title="Click to edit shift start/end times and auto-logout rules"
          >
            <Moon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>
              Shift: {summary?.globalShiftStartTime || "19:00"} – {summary?.globalShiftEndTime || "04:00"}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-[10px] font-mono font-extrabold text-purple-700 dark:text-purple-300">
              Auto End @ {summary?.globalShiftEndTime || "04:00"}
            </span>
            <Edit2 className="w-3 h-3 ml-0.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={activeTab === "roster" ? exportStaffToCSV : exportLogsToCSV}
            className="liquid-glass-button-secondary px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Export Attendance to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchDashboardSummary()}
            disabled={loading}
            className="liquid-glass-button-secondary p-2.5 rounded-2xl text-xs flex items-center justify-center cursor-pointer shadow-sm"
            title="Refresh Attendance Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`mb-6 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              : "bg-red-500/15 border border-red-500/30 text-red-900 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Interactive Single Employee & Single Month Filter Command Bar */}
      <div className="p-4 sm:p-5 rounded-3xl mb-7 bg-white/70 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 shadow-lg backdrop-blur-md relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Employee Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#EA580C] shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-0.5">
                  Filter by Staff Member
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="liquid-glass-input w-full px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">👥 All Staff Members ({summary?.staffSummaries?.length || 12} enrolled)</option>
                  {(summary?.allStaffList?.length ? summary.allStaffList : summary?.staffSummaries?.map(s => ({ id: s.userId, name: s.name, username: s.username, role: s.role })) || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (@{emp.username}) · {emp.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[210px]">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-0.5">
                  Filter by Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="liquid-glass-input w-full px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="ALL">📅 All Months (Lifetime Shift History)</option>
                  <option value="2026-08">August 2026 (Aug.xlsx Ingested)</option>
                  <option value="2026-09">September 2026 (Active Roster Floor)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Filter Reset & Status Pills */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {(selectedEmployee !== "ALL" || selectedMonth !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee("ALL");
                  setSelectedMonth("ALL");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#475569] dark:text-[#CBD5E1] transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
              {selectedMonth === "ALL" ? "All Time" : selectedMonth === "2026-08" ? "Aug 2026" : "Sep 2026"} · {selectedEmployee === "ALL" ? "All Staff" : "Single Staff"}
            </span>
          </div>
        </div>

        {/* Single Employee Drilldown Spotlight Card */}
        {summary?.singleEmployeeStats && (
          <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-purple-500/10 to-transparent border border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-orange-500/20">
                  {summary.singleEmployeeStats.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                      {summary.singleEmployeeStats.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C]">
                      {summary.singleEmployeeStats.role}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {summary.singleEmployeeStats.teamName}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
                    @{summary.singleEmployeeStats.username} · {selectedMonth === "ALL" ? "Lifetime Shift Record" : `Month: ${selectedMonth}`}
                  </p>
                </div>
              </div>

              {/* Individual Metrics Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
                  <p className="text-[10px] uppercase opacity-80">Present</p>
                  <p className="text-sm font-mono">{summary.singleEmployeeStats.presentDays}d</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold text-center">
                  <p className="text-[10px] uppercase opacity-80">Half Days</p>
                  <p className="text-sm font-mono">{summary.singleEmployeeStats.halfDays}d</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold text-center">
                  <p className="text-[10px] uppercase opacity-80">Absent</p>
                  <p className="text-sm font-mono">{summary.singleEmployeeStats.absentDays}d</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-bold text-center">
                  <p className="text-[10px] uppercase opacity-80">Late Marks</p>
                  <p className="text-sm font-mono">{summary.singleEmployeeStats.lateMarks}</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold text-center">
                  <p className="text-[10px] uppercase opacity-80">Shift Hours</p>
                  <p className="text-sm font-mono">{summary.singleEmployeeStats.totalShiftHours}h</p>
                </div>
              </div>
            </div>

            {/* Daily Shift Timeline for this Single Employee */}
            {summary.singleEmployeeStats.dailyLogs.length > 0 && (
              <div className="mt-3 overflow-x-auto max-h-56 custom-scrollbar rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Login</th>
                      <th className="py-2 px-3">Logout</th>
                      <th className="py-2 px-3 text-right">Productive Mins</th>
                      <th className="py-2 px-3 text-right">Breaks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/40 dark:bg-slate-900/40">
                    {summary.singleEmployeeStats.dailyLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-[#0F172A] dark:text-white">
                          {log.date} <span className="text-[10px] text-slate-400 font-normal">({log.dayName})</span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              log.status === "PRESENT"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : log.status === "LATE"
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                                : log.status === "HALF_DAY"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            ● {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {new Date(log.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {log.logoutAt
                            ? new Date(log.logoutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Active Floor"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {log.productiveMins}m ({Math.round((log.productiveMins / 60) * 10) / 10}h)
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {log.breakMins}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Metric KPI Cards (5 Cards Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-7">
        {/* Total Attendance Records */}
        <div className="liquid-glass p-4 rounded-2xl border border-white/70 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Total Shifts
            </span>
            <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-mono">
              {summary?.totalShiftsRecorded ?? 373}
            </p>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Shift Records Logged
            </p>
          </div>
        </div>

        {/* Enrolled Staff */}
        <div className="liquid-glass p-4 rounded-2xl border border-white/70 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Enrolled Staff
            </span>
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-[#0284C7] dark:text-[#38BDF8] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-mono">
              {summary?.totalStaffEnrolled ?? 12}
            </p>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Active Floor Personnel
            </p>
          </div>
        </div>

        {/* Active On Duty */}
        <div className="liquid-glass p-4 rounded-2xl border border-white/70 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              On Duty
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-[#059669] dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-extrabold text-[#059669] dark:text-emerald-400 font-mono">
                {summary?.onDutyCount ?? 0}
              </p>
              {summary && summary.onDutyCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Live Calling Floor
            </p>
          </div>
        </div>

        {/* On Break */}
        <div className="liquid-glass p-4 rounded-2xl border border-white/70 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              On Break
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center">
              <Coffee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#D97706] dark:text-[#FBBF24] font-mono">
              {summary?.onBreakCount ?? 0}
            </p>
            <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
              Tea / Dinner / Bio Break
            </p>
          </div>
        </div>

        {/* Auto Shift End Card */}
        <div className="liquid-glass p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 col-span-2 sm:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Auto Shift End
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Moon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-purple-900 dark:text-purple-100 font-mono">
              {summary?.globalShiftEndTime || "04:00"}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-purple-600 dark:text-purple-400">
                Cutoff @ {summary?.globalShiftEndTime || "04:00"}
              </p>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Edit</span>
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs and Search/Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-200/70 dark:border-slate-800 pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100/70 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "roster"
                ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-sm"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Staff Attendance Totals</span>
            <span className="px-1.5 py-0.2 rounded-md bg-sky-500/15 text-[10px] font-mono text-[#0284C7] font-bold">
              {summary?.staffSummaries?.length || 12}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "live"
                ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-sm"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Live Floor Shifts</span>
            {summary && summary.onDutyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-[10px] font-mono text-[#059669] font-bold">
                {summary.onDutyCount} Live
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-sm"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Recent Shift Logs</span>
            <span className="px-1.5 py-0.2 rounded-md bg-purple-500/15 text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold">
              {summary?.recentShiftLogs?.length || 0}
            </span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          {activeTab === "history" && (
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value)}
              className="liquid-glass-input px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ABSENT">Absent</option>
            </select>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "roster"
                  ? "Search staff name, team..."
                  : "Filter shift records..."
              }
              className="liquid-glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder-[#94A3B8] w-48 sm:w-60 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW 1: Staff Attendance Totals & Roster (August Ledger + Live Aggregate) */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          {/* Roster Quick Summary Stat Pill Banner */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Full Roster Totals:</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              ● {staffTotals.present} Present Days
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              🌓 {staffTotals.half} Half Days
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              ✕ {staffTotals.absent} Absent Days
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20">
              ⚠️ {staffTotals.late} Late Marks
            </span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-sky-500/10 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/20 font-mono">
              ⏱ {Math.round(staffTotals.hours * 10) / 10} Total Productive Hours
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Team</th>
                  <th className="py-3 px-3 text-center">Present Days</th>
                  <th className="py-3 px-3 text-center">Half Days</th>
                  <th className="py-3 px-3 text-center">Absent Days</th>
                  <th className="py-3 px-3 text-center">Late Marks</th>
                  <th className="py-3 px-3 text-right">Total Productive Hours</th>
                  <th className="py-3 px-3">Floor Status</th>
                  <th className="py-3 px-3 text-right">Last Log-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#94A3B8]">
                      No staff attendance records matched your search query.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr
                      key={s.userId}
                      className="hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#0F172A] dark:text-white">{s.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                @{s.username}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-[#64748B] dark:text-[#94A3B8]">
                                {s.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-500/10 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/20">
                          {s.teamName}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-extrabold bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30">
                          {s.presentDays}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30">
                          {s.halfDays}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          {s.absentDays}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            s.lateMarks > 0
                              ? "bg-orange-500/15 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-[#94A3B8]"
                          }`}
                        >
                          {s.lateMarks}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono text-xs font-extrabold text-[#0F172A] dark:text-white">
                          {s.totalShiftHours.toFixed(1)} hrs
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.currentShiftStatus === "On Duty"
                              ? "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30 animate-pulse"
                              : s.currentShiftStatus === "On Break"
                              ? "bg-amber-500/15 text-[#D97706] dark:text-[#FBBF24] border border-amber-500/30"
                              : s.currentShiftStatus === "Completed"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#94A3B8]"
                          }`}
                        >
                          ● {s.currentShiftStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {s.lastLoginAt
                          ? new Date(s.lastLoginAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Aggregated Totals Footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-extrabold text-[#0F172A] dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                  <td className="py-3.5 px-3" colSpan={2}>
                    Total Across All {filteredStaff.length} Employees:
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {staffTotals.present} Days
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-amber-600 dark:text-amber-400 text-sm">
                    {staffTotals.half} Days
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-rose-600 dark:text-rose-400 text-sm">
                    {staffTotals.absent} Days
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-orange-600 dark:text-orange-400 text-sm">
                    {staffTotals.late}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-sm font-black text-sky-600 dark:text-sky-400">
                    {Math.round(staffTotals.hours * 10) / 10} hrs
                  </td>
                  <td className="py-3.5 px-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Live Floor Shifts Table */}
      {activeTab === "live" && (
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
              {filteredLiveRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#94A3B8]">
                    <div className="max-w-md mx-auto">
                      <Clock className="w-8 h-8 text-[#94A3B8] mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-sm text-[#0F172A] dark:text-white">
                        No active floor shifts right now
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Scheduled floor shift runs from {summary?.globalShiftStartTime || "19:00"} to {summary?.globalShiftEndTime || "04:00"}. Active floor staff will appear here immediately upon logging in.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLiveRecords.map((r) => (
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
                        {summary?.globalShiftStartTime || "19:00"} – {summary?.globalShiftEndTime || "04:00"}
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#059669] dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Floor Active</span>
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
      )}

      {/* VIEW 3: Historical Shift Logs (Last 50 Records) */}
      {activeTab === "history" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Shift Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Log-In</th>
                <th className="py-3 px-3">Log-Out</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Break Mins</th>
                <th className="py-3 px-3 text-right">Net Productive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                    No historical shift records matched your filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-[#0F172A] dark:text-white">
                      {r.shiftDate}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#0F172A] dark:text-white">{r.name}</p>
                      <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">@{r.username}</p>
                    </td>
                    <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8]">
                      {r.campaignName}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {new Date(r.loginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {r.logoutAt ? (
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          {new Date(r.logoutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-[#059669] dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === "PRESENT"
                            ? "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30"
                            : r.status === "LATE"
                            ? "bg-amber-500/15 text-[#D97706] border border-amber-500/30"
                            : r.status === "HALF_DAY"
                            ? "bg-sky-500/15 text-[#0284C7] border border-sky-500/30"
                            : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[#64748B] dark:text-[#94A3B8]">
                      {r.totalBreakMinutes}m
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-[#0F172A] dark:text-white">
                      {formatMinutes(r.netProductiveMinutes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT AUTO SHIFT HOURS & LOGOUT CUTOFF MODAL */}
      {showEditModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
            <div className="liquid-glass w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative bg-white/95 dark:bg-slate-900/95">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                    Edit Shift Hours & Auto Log-Out
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Configure global shift timing, automatic night cutoff, and arrival grace window.
                  </p>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveShiftTimes} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shift Start Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                      Shift Start Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      required
                      className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none"
                    />
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                      e.g. 19:00 (7:00 PM evening floor start)
                    </p>
                  </div>

                  {/* Auto Shift End Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-1.5 flex items-center gap-1">
                      <span>Auto Shift End (HH:MM)</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    </label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      required
                      className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold border-purple-500/40 text-purple-900 dark:text-purple-100 focus:outline-none"
                    />
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                      e.g. 04:00 (4:00 AM next morning cutoff)
                    </p>
                  </div>
                </div>

                {/* Grace Minutes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                    Late Arrival Grace Window (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={editGraceMins}
                    onChange={(e) => setEditGraceMins(Number(e.target.value))}
                    required
                    className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                    Logins past {editStartTime} + {editGraceMins}m are marked as LATE.
                  </p>
                </div>

                {/* Explanatory Info Card */}
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Automated Shift Conclusion Protection</p>
                      <p className="mt-0.5 text-[11px] text-purple-800/80 dark:text-purple-300/80">
                        When floor staff remain active past the scheduled cutoff (<strong>{editEndTime} AM</strong>), the system will automatically log them out, record any open breaks, compute net productive minutes, and prevent hanging overnight sessions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="liquid-glass-button-secondary flex-1 py-3 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTimes}
                    className="liquid-glass-button-primary flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 cursor-pointer shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                  >
                    {isSavingTimes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Roster & Timers...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Shift Hours</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
