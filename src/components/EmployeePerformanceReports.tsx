"use client";

import React, { useState, useEffect } from "react";
import {
  getEmployeePerformanceReportAction,
  getFullLeadsExportAction,
  EmployeePerformanceItem,
  LeadExportItem,
} from "@/app/actions/reports";
import {
  FileSpreadsheet,
  Download,
  TrendingUp,
  Search,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  PieChart,
  LayoutGrid,
  Award,
  Loader2,
} from "lucide-react";
import { useCountUp, MiniSparkline } from "@/components/ui/visual-utils";

export function EmployeePerformanceReports() {
  const [report, setReport] = useState<EmployeePerformanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getEmployeePerformanceReportAction();
      setReport(data);
    } catch {
      // Fallback
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, []);

  const filtered = report.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.username.toLowerCase().includes(search.toLowerCase()) ||
      r.teamName.toLowerCase().includes(search.toLowerCase())
  );

  // Summary Metrics
  const totalFloorLeads = report.reduce((sum, r) => sum + r.totalLeads, 0);
  const totalFloorSales = report.reduce((sum, r) => sum + r.approvedSales, 0);
  const totalFloorCommissions = report.reduce((sum, r) => sum + r.earnedCommissions, 0);
  const avgConversion = totalFloorLeads > 0 ? Math.round((totalFloorSales / totalFloorLeads) * 100) : 0;

  const [viewMode, setViewMode] = useState<"table" | "charts" | "split">("split");

  // 1. Export Employee Performance CSV
  const handleExportPerformanceCSV = () => {
    setExporting(true);
    const headers = [
      "Employee Name",
      "Username",
      "Role",
      "Assigned Team",
      "Total Leads",
      "Approved Sales",
      "Rejected Leads",
      "Callbacks Scheduled",
      "Conversion Rate (%)",
      "Commissions Earned (Rs.)",
      "Productive Hours",
      "Late Arrivals",
    ];

    const rows = report.map((r) => [
      `"${r.name}"`,
      `"${r.username}"`,
      r.role,
      `"${r.teamName}"`,
      r.totalLeads,
      r.approvedSales,
      r.rejectedCount,
      r.callbacksCount,
      `${r.conversionRate}%`,
      r.earnedCommissions.toFixed(2),
      r.totalShiftHours,
      r.lateArrivals,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Employee_Performance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess("Employee Performance Report exported successfully!");
    setTimeout(() => setDownloadSuccess(null), 4000);
    setExporting(false);
  };

  // 2. Export All Leads & Sales Master CSV
  const handleExportAllLeadsCSV = async () => {
    setExporting(true);
    try {
      const leads: LeadExportItem[] = await getFullLeadsExportAction();
      const headers = [
        "Lead ID",
        "Customer Name",
        "DOB",
        "Mobile Number",
        "Email Address",
        "Street Address",
        "Campaign",
        "Lead Source",
        "Assigned Closer",
        "Agent Name",
        "Agent Username",
        "Lead Status",
        "Callback Time",
        "Rejection Reason",
        "Approved Timestamp",
        "Summary Notes",
        "Intake Created At",
      ];

      const rows = leads.map((l) => [
        `"${l.id}"`,
        `"${l.customerName}"`,
        `"${l.dob}"`,
        `"${l.mobile}"`,
        `"${l.email}"`,
        `"${l.address}"`,
        `"${l.campaign}"`,
        l.source,
        `"${l.closerName}"`,
        `"${l.agentName}"`,
        `"${l.agentUsername}"`,
        l.status,
        `"${l.callBackTime}"`,
        `"${l.rejectionReason}"`,
        `"${l.approvedAt}"`,
        `"${l.notes}"`,
        `"${l.createdAt}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Leads_Sales_Master_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess("Complete Leads & Sales Master dataset exported successfully!");
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
  };

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Employee Performance Reports & Data Export Center
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Itemized staff productivity, verified sales volume, conversion rates, and 1-click comprehensive CSV exports.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPerformanceCSV}
            disabled={exporting}
            className="liquid-glass-button-secondary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer hover:border-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F97316]" /> : <Download className="w-3.5 h-3.5 text-[#F97316]" />}
            <span>{exporting ? "Exporting..." : "Export Performance CSV"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllLeadsCSV}
            disabled={exporting}
            className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>{exporting ? "Exporting..." : "Export All Leads & Sales Master"}</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* KPI Cards Strip with Animated Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Total Floor Leads</span>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white mt-1">
            {totalFloorLeads}
          </p>
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Cross-agent entries</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Approved Sales</span>
          <p className="text-2xl font-extrabold font-mono text-[#10B981] mt-1">
            {totalFloorSales}
          </p>
          <p className="text-[10px] text-[#10B981] mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Passed verification</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Average Quality Rate</span>
          <p className="text-2xl font-extrabold font-mono text-[#0F172A] dark:text-white mt-1">
            {avgConversion}%
          </p>
          <p className="text-[10px] text-[#F97316] mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Floor conversion</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
          <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">Commissions Paid</span>
          <p className="text-2xl font-extrabold font-mono text-[#EA580C] dark:text-[#FB923C] mt-1">
            ₹{totalFloorCommissions.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1">Direct performance payroll</p>
        </div>
      </div>

      {/* Visual Charts Section (Shown in 'split' or 'charts' mode) */}
      {(viewMode === "split" || viewMode === "charts") && report.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Chart 1: Agent Lead & Sales Comparison Bar Chart */}
          <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                  Agent Sales vs Intake Volume
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  Total Intake
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  Approved Sales
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {report.map((emp) => {
                const maxVal = Math.max(...report.map((r) => r.totalLeads), 1);
                const leadPercent = Math.round((emp.totalLeads / maxVal) * 100);
                const salesPercent = Math.round((emp.approvedSales / maxVal) * 100);

                return (
                  <div key={emp.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                        {emp.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {emp.approvedSales} / {emp.totalLeads} ({emp.conversionRate}%)
                      </span>
                    </div>
                    {/* Double Bar */}
                    <div className="space-y-0.5">
                      <div className="w-full h-2 rounded-full bg-slate-200/60 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500/80 transition-all duration-700 ease-out"
                          style={{ width: `${leadPercent}%` }}
                        />
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200/60 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${salesPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Floor Status Breakdown Donut & Quality Metrics */}
          <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-white">
                Floor Intake Quality Distribution
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
              {/* SVG Donut */}
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                  {/* Background Circle */}
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-200 dark:text-slate-700" />
                  {/* Approved Arc (Emerald) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={`${(totalFloorSales / Math.max(totalFloorLeads, 1)) * 301.6} 301.6`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Rejections Arc (Red) */}
                  {(() => {
                    const totalRejections = report.reduce((sum, r) => sum + r.rejectedCount, 0);
                    const rejectOffset = (totalFloorSales / Math.max(totalFloorLeads, 1)) * 301.6;
                    const rejectLength = (totalRejections / Math.max(totalFloorLeads, 1)) * 301.6;
                    return (
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="14"
                        strokeDasharray={`${rejectLength} 301.6`}
                        strokeDashoffset={-rejectOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-extrabold font-mono text-[#0F172A] dark:text-white">
                    {avgConversion}%
                  </span>
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">Pass</span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Approved Sales:</span>
                  <span className="font-mono font-bold text-emerald-600">{totalFloorSales}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Rejected Leads:</span>
                  <span className="font-mono font-bold text-red-600">
                    {report.reduce((sum, r) => sum + r.rejectedCount, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-purple-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Scheduled Callbacks:</span>
                  <span className="font-mono font-bold text-purple-600">
                    {report.reduce((sum, r) => sum + r.callbacksCount, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Filter, View Switcher & Refresh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by employee name, username, or team..."
              className="liquid-glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="liquid-glass-button-secondary p-2 rounded-xl text-xs flex items-center justify-center cursor-pointer"
            title="Refresh Performance Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* View Switcher: Split / Charts / Table */}
        <div className="flex items-center p-1 rounded-xl liquid-glass border border-white/70 dark:border-slate-700 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "split"
                ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("charts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "charts"
                ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Charts</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "table"
                ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Performance Roster Table (Hidden in 'charts' only mode) */}
      {viewMode !== "charts" && (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Employee</th>
              <th className="py-2.5 px-3">Role & Team</th>
              <th className="py-2.5 px-3 text-center">Total Leads</th>
              <th className="py-2.5 px-3 text-center">Approved Sales</th>
              <th className="py-2.5 px-3 text-center">Rejections</th>
              <th className="py-2.5 px-3 text-center">Callbacks</th>
              <th className="py-2.5 px-3 text-center">Conversion</th>
              <th className="py-2.5 px-3 text-center">Productive Hrs</th>
              <th className="py-2.5 px-3 text-center">Late Marks</th>
              <th className="py-2.5 px-3 text-right">Commissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((emp) => (
              <tr key={emp.userId} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-3 px-3">
                  <p className="font-extrabold text-[#0F172A] dark:text-white">{emp.name}</p>
                  <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">@{emp.username}</p>
                </td>

                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8]">
                    {emp.role}
                  </span>
                  <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{emp.teamName}</p>
                </td>

                <td className="py-3 px-3 font-mono font-bold text-center text-[#0F172A] dark:text-white">
                  {emp.totalLeads}
                </td>

                <td className="py-3 px-3 font-mono font-bold text-center text-[#10B981]">
                  {emp.approvedSales}
                </td>

                <td className="py-3 px-3 font-mono text-center text-red-600 dark:text-red-400">
                  {emp.rejectedCount}
                </td>

                <td className="py-3 px-3 font-mono text-center text-purple-600 dark:text-purple-400">
                  {emp.callbacksCount}
                </td>

                <td className="py-3 px-3 font-mono font-bold text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      emp.conversionRate >= 70
                        ? "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-[#D97706] dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {emp.conversionRate}%
                  </span>
                </td>

                <td className="py-3 px-3 font-mono text-center text-[#64748B] dark:text-[#94A3B8]">
                  {emp.totalShiftHours}h
                </td>

                <td className="py-3 px-3 font-mono text-center">
                  {emp.lateArrivals > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                      {emp.lateArrivals}
                    </span>
                  ) : (
                    <span className="text-[#94A3B8]">0</span>
                  )}
                </td>

                <td className="py-3 px-3 font-mono font-extrabold text-right text-[#EA580C] dark:text-[#FB923C]">
                  ₹{emp.earnedCommissions.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
