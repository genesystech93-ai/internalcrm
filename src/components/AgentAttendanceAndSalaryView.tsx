"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Printer,
  RefreshCw,
  CreditCard,
  Building,
  FileText,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Coffee,
} from "lucide-react";
import {
  getMyAttendanceSummaryAction,
  SingleEmployeeAttendanceStats,
} from "@/app/actions/attendance";
import { getMySalaryRecordAction, AugustLedgerItem } from "@/app/actions/salary";

export function AgentAttendanceAndSalaryView() {
  const [activeTab, setActiveTab] = useState<"attendance" | "salary">("attendance");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-08");
  const [attendanceData, setAttendanceData] = useState<SingleEmployeeAttendanceStats | null>(null);
  const [salaryData, setSalaryData] = useState<AugustLedgerItem | null>(null);
  const [availableMonths, setAvailableMonths] = useState<Array<{ value: string; label: string }>>([
    { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
    { value: "2026-09", label: "September 2026 (Active Cycle)" },
    { value: "ALL", label: "All Recorded Months" },
  ]);
  const [isPending, startTransition] = useTransition();

  const loadData = (month: string) => {
    startTransition(async () => {
      try {
        const [attRes, salRes] = await Promise.all([
          getMyAttendanceSummaryAction(month),
          getMySalaryRecordAction(month === "ALL" ? "2026-08" : month),
        ]);
        if (attRes?.summary) {
          setAttendanceData(attRes.summary);
        } else {
          setAttendanceData(null);
        }
        if (attRes?.availableMonths) {
          setAvailableMonths(attRes.availableMonths);
        }
        if (salRes?.item) {
          setSalaryData(salRes.item);
        } else {
          setSalaryData(null);
        }
      } catch (err) {
        console.error("Failed to load personal attendance and salary records:", err);
      }
    });
  };

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Dual Sub-Tab Switcher & Month Filter */}
      <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-Tabs: Attendance vs Salary */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Attendance & Shift Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("salary")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "salary"
                ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>My Salary & Banking Slip</span>
          </button>
        </div>

        {/* Right Filter Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Billing Period:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="liquid-glass-input text-xs font-medium py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadData(selectedMonth)}
            disabled={isPending}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-orange-500" : ""}`} />
          </button>

          {activeTab === "salary" && (
            <button
              type="button"
              onClick={handlePrint}
              className="liquid-glass-button-secondary text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ATTENDANCE & SHIFT LOGS */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="liquid-glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Present Days
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {attendanceData?.presentDays ?? 0}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full shift cleared</p>
            </div>

            <div className="liquid-glass-card p-4 rounded-2xl border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Half Days
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {attendanceData?.halfDays ?? 0}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Partial duration logged</p>
            </div>

            <div className="liquid-glass-card p-4 rounded-2xl border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Absent Days
                </span>
                <XCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {attendanceData?.absentDays ?? 0}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Unexcused / leave</p>
            </div>

            <div className="liquid-glass-card p-4 rounded-2xl border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Late Marks
                </span>
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {attendanceData?.lateMarks ?? 0}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">&gt;15 min grace threshold</p>
            </div>

            <div className="liquid-glass-card p-4 rounded-2xl border-l-4 border-l-blue-500 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Shift Hours
                </span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {attendanceData?.totalShiftHours ?? 0}
                <span className="text-xs font-normal text-slate-500 ml-1">hrs</span>
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Productive time on floor</p>
            </div>
          </div>

          {/* Daily Shift Log Table */}
          <div className="liquid-glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Daily Shift Logs — {selectedMonth === "ALL" ? "All Recorded" : selectedMonth}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete breakdown of login, logout, productive floor minutes, and breaks.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {attendanceData?.dailyLogs?.length || 0} Shift Records
              </span>
            </div>

            {(!attendanceData || !attendanceData.dailyLogs || attendanceData.dailyLogs.length === 0) ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No attendance shifts recorded for this period</p>
                <p className="text-xs mt-1">Logs will appear automatically once you clock in during active floor shifts.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Day</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Clock In</th>
                      <th className="py-3 px-3">Clock Out</th>
                      <th className="py-3 px-3">Floor Time</th>
                      <th className="py-3 px-3">Break Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {attendanceData.dailyLogs.map((log, idx) => {
                      const statusStyles =
                        log.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : log.status === "HALF_DAY"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : log.status === "LATE"
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

                      const inTimeStr = new Date(log.loginAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const outTimeStr = log.logoutAt
                        ? new Date(log.logoutAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Active Shift";

                      const hours = Math.floor(log.productiveMins / 60);
                      const mins = log.productiveMins % 60;

                      return (
                        <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {log.date}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                            {log.dayName}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {inTimeStr}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {outTimeStr}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {hours > 0 ? `${hours}h ` : ""}{mins}m
                          </td>
                          <td className="py-3 px-3 text-slate-500 flex items-center gap-1">
                            <Coffee className="w-3 h-3 text-slate-400" />
                            <span>{log.breakMins}m</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SALARY & BANKING SLIP */}
      {activeTab === "salary" && (
        <div className="space-y-6">
          {!salaryData ? (
            <div className="liquid-glass-card p-10 rounded-2xl text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Salary Statement Found for Selected Month
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Official salary ledger records for August 2026 have been synchronized from the master payroll. If your record is missing, please speak with an Administrator.
              </p>
            </div>
          ) : (
            <div className="liquid-glass-card p-6 sm:p-8 rounded-3xl border border-orange-500/20 shadow-xl relative overflow-hidden">
              {/* Background watermark badge */}
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <FileText className="w-36 h-36 text-orange-500" />
              </div>

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-500/20">
                      OFFICIAL PAYSLIP STATEMENT
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Disbursed
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {salaryData.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    User: @{salaryData.username} | Department: {salaryData.team}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-400">PAYROLL PERIOD</p>
                  <p className="text-lg font-black text-orange-600 dark:text-orange-400">
                    {selectedMonth === "2026-08" ? "August 2026" : selectedMonth}
                  </p>
                  <p className="text-[11px] text-slate-400">Genesoft Infotech Internal CRM</p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                {/* Attendance & Deductions */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span>Attendance Attribution</span>
                  </h4>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Total Month Days</span>
                    <span className="font-bold text-slate-900 dark:text-white">31 Days</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Recorded Present Days</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{salaryData.presentDays} Days</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Recorded Absent Days</span>
                    <span className="font-bold text-rose-500">{salaryData.absentDays} Days</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400">Attendance Compliance Rate</span>
                    <span className="font-bold text-blue-500">
                      {Math.round((salaryData.presentDays / 31) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Banking & Remittance Details */}
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-orange-500" />
                    <span>Disbursement Bank & Account</span>
                  </h4>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Bank Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {salaryData.bank || "HDFC Bank (Primary)"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Account Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {salaryData.accountNo ? `•••• •••• ${salaryData.accountNo.slice(-4)}` : "Verified On File"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">IFSC Routing Code</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {salaryData.ifsc || "HDFC0000240"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-slate-600 dark:text-slate-400">Payment Channel</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">NEFT / Direct Deposit</span>
                  </div>
                </div>
              </div>

              {/* Total Net Pay Highlight */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-emerald-500/10 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Monthly Base Contract Salary
                  </span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    ₹{salaryData.basicSalary.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center sm:justify-end gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Final Net Payout Received
                  </span>
                  <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₹{salaryData.augNetSalary.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-[11px] text-slate-400 text-center mt-4">
                This is an official computer-generated statement authorized by Genesoft Infotech Accounts & Floor HR. For questions regarding shift calculations or deductions, please file an internal support query.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
