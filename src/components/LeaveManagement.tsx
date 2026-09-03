"use client";

import React, { useState, useEffect } from "react";
import { applyLeaveAction, reviewLeaveAction, getLeaveRequestsAction } from "@/app/actions/leave";
import {
  Calendar,
  CheckCircle2,
  Plus,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Clock,
} from "lucide-react";
import { LeaveStatus, LeaveType } from "@prisma/client";

interface LeaveItem {
  id: string;
  username: string;
  name: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
}

export function LeaveManagement({ isAdmin = false }: { isAdmin?: boolean }) {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Calendar State
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDayLeaves, setSelectedDayLeaves] = useState<{ date: string; items: LeaveItem[] } | null>(null);

  const loadLeaves = async () => {
    try {
      const data = await getLeaveRequestsAction();
      setLeaves(data as LeaveItem[]);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append("leaveType", leaveType);
    fd.append("startDate", startDate);
    fd.append("endDate", endDate);
    fd.append("reason", reason);

    const res = await applyLeaveAction(fd);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Leave submitted.", type: "success" });
      setShowApplyModal(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      await loadLeaves();
    }
    setLoading(false);
  };

  const handleReview = async (leaveId: string, decision: LeaveStatus) => {
    setLoading(true);
    const res = await reviewLeaveAction(leaveId, decision);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Status updated.", type: "success" });
      await loadLeaves();
    }
    setLoading(false);
  };

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              {isAdmin ? "Employee Leave Applications & Approvals" : "My Leave Applications"}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {isAdmin
              ? "Review staff planned absences to maintain minimum dialer floor staffing."
              : "Submit planned time off and track authorization status."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Switcher */}
          <div className="flex items-center p-1 rounded-xl liquid-glass border border-white/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "calendar"
                  ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar</span>
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
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {!isAdmin && (
            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-md shadow-orange-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* VIEW 1: Interactive Monthly Calendar Grid */}
      {viewMode === "calendar" && (
        <div className="mb-6 space-y-4">
          {/* Calendar Header & Month Navigation */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                {calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C]">
                {leaves.length} Scheduled
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg liquid-glass-button-secondary cursor-pointer hover:text-orange-500"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold liquid-glass-button-secondary cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg liquid-glass-button-secondary cursor-pointer hover:text-orange-500"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Day Weekday Labels */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {(() => {
              const year = calendarDate.getFullYear();
              const month = calendarDate.getMonth();
              const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start
              const totalDays = new Date(year, month + 1, 0).getDate();
              const todayStr = new Date().toISOString().split("T")[0];

              const cells = [];

              // Empty padding for days before the 1st
              for (let i = 0; i < firstDayIndex; i++) {
                cells.push(
                  <div key={`empty-${i}`} className="min-h-[72px] rounded-xl bg-transparent opacity-20 border border-transparent" />
                );
              }

              // Days of the current month
              for (let day = 1; day <= totalDays; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const dayLeaves = leaves.filter((l) => l.startDate <= dateStr && l.endDate >= dateStr);
                const isSelected = selectedDayLeaves?.date === dateStr;

                cells.push(
                  <div
                    key={`day-${day}`}
                    onClick={() => {
                      if (dayLeaves.length > 0) {
                        setSelectedDayLeaves(isSelected ? null : { date: dateStr, items: dayLeaves });
                      }
                    }}
                    className={`min-h-[72px] p-2 rounded-xl transition-all border text-left flex flex-col justify-between ${
                      dayLeaves.length > 0 ? "cursor-pointer hover:scale-[1.02] shadow-xs" : ""
                    } ${
                      isSelected
                        ? "ring-2 ring-[#F97316] bg-orange-500/10 border-orange-500/40"
                        : isToday
                        ? "bg-white/90 dark:bg-slate-800/90 border-orange-500/50 shadow-sm"
                        : "bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-mono ${
                          isToday
                            ? "w-5 h-5 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px]"
                            : "text-[#0F172A] dark:text-white"
                        }`}
                      >
                        {day}
                      </span>
                      {dayLeaves.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
                      )}
                    </div>

                    {/* Mini Leave Dots / Labels */}
                    <div className="space-y-0.5 mt-1">
                      {dayLeaves.slice(0, 2).map((l) => (
                        <div
                          key={l.id}
                          className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${
                            l.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : l.status === "REJECTED"
                              ? "bg-red-500/20 text-red-700 dark:text-red-300"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {isAdmin ? l.name.split(" ")[0] : l.leaveType}
                        </div>
                      ))}
                      {dayLeaves.length > 2 && (
                        <span className="text-[8px] font-bold text-slate-400">
                          +{dayLeaves.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>

          {/* Selected Day Leave Details Pop-down */}
          {selectedDayLeaves && (
            <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-orange-500/30 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#F97316]" />
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                    Scheduled Absences for {selectedDayLeaves.date}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayLeaves(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2">
                {selectedDayLeaves.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#0F172A] dark:text-white mr-2">
                        {item.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono mr-2">
                        {item.leaveType}
                      </span>
                      <span className="text-[11px] text-slate-500 italic">
                        &ldquo;{item.reason || "No reason given"}&rdquo;
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "APPROVED"
                          ? "bg-emerald-500/15 text-[#059669] dark:text-emerald-400"
                          : item.status === "REJECTED"
                          ? "bg-red-500/15 text-[#DC2626] dark:text-red-400"
                          : "bg-amber-500/15 text-[#D97706] dark:text-amber-400"
                      }`}
                    >
                      ● {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Leaves Roster Table */}
      {viewMode === "table" && (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              {isAdmin && <th className="py-2.5 px-3">Employee</th>}
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Date Range</th>
              <th className="py-2.5 px-3">Reason</th>
              <th className="py-2.5 px-3">Status</th>
              {isAdmin && <th className="py-2.5 px-3 text-right">Decision Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="py-6 text-center text-[#94A3B8]">
                  No leave applications recorded.
                </td>
              </tr>
            ) : (
              leaves.map((l) => (
                <tr key={l.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  {isAdmin && (
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#0F172A] dark:text-white">{l.name}</p>
                      <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">@{l.username}</p>
                    </td>
                  )}
                  <td className="py-3 px-3 font-semibold text-[#0F172A] dark:text-white">
                    {l.leaveType}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#475569] dark:text-[#94A3B8]">
                    {l.startDate} → {l.endDate}
                  </td>
                  <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8] max-w-xs truncate">
                    {l.reason || "None specified"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === "APPROVED"
                          ? "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30"
                          : l.status === "REJECTED"
                          ? "bg-red-500/15 text-[#DC2626] dark:text-red-400 border border-red-500/30"
                          : "bg-amber-500/15 text-[#D97706] dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      ● {l.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-right">
                      {l.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleReview(l.id, "APPROVED")}
                            disabled={loading}
                            className="liquid-glass-button-secondary py-1 px-2.5 rounded-lg text-[11px] font-bold text-[#059669] hover:bg-emerald-500/10 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(l.id, "REJECTED")}
                            disabled={loading}
                            className="liquid-glass-button-secondary py-1 px-2.5 rounded-lg text-[11px] font-bold text-[#EF4444] hover:bg-red-500/10 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">Resolved</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowApplyModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowApplyModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white mb-4">
              Apply for Planned Leave
            </h3>

            <form onSubmit={handleApply} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Leave Category
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Reason for Absence
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain reason for leave..."
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
