"use client";

import React, { useState, useEffect } from "react";
import {
  loginShiftAction,
  logoutShiftAction,
  undoLogoutAction,
  startBreakAction,
  endBreakAction,
  getActiveShiftStatusAction,
} from "@/app/actions/attendance";
import { BreakType } from "@prisma/client";
import {
  Clock,
  Coffee,
  Utensils,
  Moon,
  AlertCircle,
  Play,
  Square,
  Undo2,
  CheckCircle2,
  Hourglass,
  Loader2,
  Zap,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export interface ShiftState {
  attendanceId: string;
  loginAt: string;
  logoutAt: string | null;
  status: string;
  campaignName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  isLoggedOut: boolean;
  isUndoEligible: boolean;
  logoutElapsedMinutes: number;
  activeBreak: {
    id: string;
    breakType: BreakType;
    customReason: string | null;
    startTime: string;
  } | null;
  breaks: Array<{
    id: string;
    breakType: BreakType;
    customReason: string | null;
    durationMinutes: number;
    startTime: string;
    endTime: string | null;
  }>;
}

export function ShiftAttendanceBar({
  onNavigateToShiftTab,
}: {
  onNavigateToShiftTab?: () => void;
}) {
  const [shiftData, setShiftData] = useState<ShiftState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // Live Timers
  const [elapsedShiftSeconds, setElapsedShiftSeconds] = useState<number>(0);
  const [elapsedBreakSeconds, setElapsedBreakSeconds] = useState<number>(0);

  const fetchStatus = async () => {
    try {
      const data = await getActiveShiftStatusAction();
      setShiftData(data as ShiftState | null);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    const handleShiftUpdated = () => fetchStatus();
    window.addEventListener("shift-status-updated", handleShiftUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("shift-status-updated", handleShiftUpdated);
    };
  }, []);

  // Tick timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (shiftData && !shiftData.isLoggedOut && shiftData.loginAt) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(shiftData.loginAt).getTime()) / 1000));
        setElapsedShiftSeconds(diff);
      }
      if (shiftData?.activeBreak) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(shiftData.activeBreak.startTime).getTime()) / 1000));
        setElapsedBreakSeconds(diff);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [shiftData]);

  const notifyUpdate = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("shift-status-updated"));
    }
  };

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatBreakTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);
    const res = await loginShiftAction();
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift session active! Attendance logged.", type: "success" });
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleLogoutConfirm = async () => {
    setLoading(true);
    setShowLogoutModal(false);
    setMessage(null);
    const res = await logoutShiftAction(shiftData?.attendanceId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift logged out. 15m resume grace window active.", type: "success" });
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleUndoLogout = async () => {
    setLoading(true);
    setMessage(null);
    const res = await undoLogoutAction(shiftData?.attendanceId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift resumed without lost time!", type: "success" });
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleStartBreak = async (type: BreakType) => {
    if (!shiftData?.attendanceId) return;
    setLoading(true);
    setMessage(null);
    const res = await startBreakAction(shiftData.attendanceId, type);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Break started.", type: "success" });
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!shiftData?.activeBreak) return;
    setLoading(true);
    setMessage(null);
    const res = await endBreakAction(shiftData.activeBreak.id);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Break ended. Shift resumed.", type: "success" });
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  // 1. MISCLICK RESUME GRACE WINDOW BANNER
  if (shiftData?.isLoggedOut && shiftData.isUndoEligible) {
    return (
      <div className="w-full">
        <div className="liquid-glass rounded-2xl p-4 sm:p-5 border-2 border-orange-500/50 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 shadow-xl shadow-orange-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] flex items-center justify-center shrink-0 border border-orange-500/30">
              <Hourglass className="w-5 h-5 animate-spin" style={{ animationDuration: "6s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-500 text-white shadow-sm">
                  Grace Window
                </span>
                <p className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                  Accidental Shift Log-Out Detected
                </p>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Logged out {shiftData.logoutElapsedMinutes}m ago. You have{" "}
                <strong className="text-orange-600 dark:text-orange-400 font-bold">
                  {Math.max(1, 15 - shiftData.logoutElapsedMinutes)}m remaining
                </strong>{" "}
                to resume your shift with zero lost hours or attendance penalties.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoLogout}
            disabled={loading}
            className="liquid-glass-button-primary px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/30 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed bg-[#EA580C] hover:bg-[#C2410C] text-white transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
            <span>Resume Shift (Undo Log-Out)</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. NOT CLOCKED IN STATE - HIGH VISIBILITY ATTENDANCE PUNCH CALLOUT
  if (!shiftData || shiftData.isLoggedOut) {
    return (
      <div className="w-full">
        <div className="liquid-glass rounded-2xl p-4 sm:p-5 border-2 border-amber-500/40 dark:border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/5 shadow-xl shadow-amber-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-rose-500 text-white shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  <span>Not Logged In</span>
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] dark:text-white">
                  Today&apos;s Shift Attendance is Inactive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {shiftData?.shiftStartTime || "19:00"} – {shiftData?.shiftEndTime || "04:00"}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-2xl leading-relaxed">
                You must <strong className="text-amber-700 dark:text-amber-400">Log In to Shift</strong> to punch your attendance, activate calling compliance, track your floor hours, and submit deal conversions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            {onNavigateToShiftTab && (
              <button
                type="button"
                onClick={onNavigateToShiftTab}
                className="liquid-glass-button-secondary text-xs px-3.5 py-2.5 rounded-xl font-bold hidden sm:inline-flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200 hover:text-[#EA580C]"
              >
                <span>Floor Schedule</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="px-6 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-xl shadow-orange-500/30 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-current text-yellow-200" />
              )}
              <span>{loading ? "Recording Punch..." : "Log In to Shift (Punch In)"}</span>
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    );
  }

  // 3. CLOCKED IN & ACTIVE SHIFT / ON BREAK CAPSULE
  return (
    <div className="w-full">
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/30 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Shift identity & live ticking duration */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Shift Active</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {shiftData.shiftStartTime || "19:00"} – {shiftData.shiftEndTime || "04:00"}
                </span>
                {shiftData.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      shiftData.status === "LATE"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    ● {shiftData.status}
                  </span>
                )}
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:inline">
                  Auto Log-Out @ {shiftData.shiftEndTime || "04:00"}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Logged Session:</span>
                <span className="font-mono text-base font-extrabold text-[#0F172A] dark:text-white tracking-wide">
                  {formatTimer(elapsedShiftSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Active Break Notice (If on break) */}
          {shiftData.activeBreak ? (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center gap-3 animate-pulse">
              <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">
                  ON BREAK: {shiftData.activeBreak.breakType}
                </p>
                <p className="font-mono text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  Time: {formatBreakTimer(elapsedBreakSeconds)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleEndBreak}
                disabled={loading}
                className="liquid-glass-button-primary py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer ml-2 flex items-center gap-1.5 bg-[#EA580C] text-white disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>End Break & Resume</span>
              </button>
            </div>
          ) : (
            /* Break Quick Buttons */
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStartBreak("FIRST_TEA")}
                disabled={loading}
                className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:border-orange-500/40 cursor-pointer"
                title="15m Evening Tea (09:30 PM – 09:45 PM)"
              >
                <Coffee className="w-3.5 h-3.5 text-orange-500" />
                <span>1st Tea (15m)</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartBreak("DINNER")}
                disabled={loading}
                className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:border-emerald-500/40 cursor-pointer"
                title="45m Main Dinner (11:30 PM – 12:15 AM)"
              >
                <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                <span>Dinner (45m)</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartBreak("MIDNIGHT_TEA")}
                disabled={loading}
                className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:border-sky-500/40 cursor-pointer"
                title="15m Midnight Coffee (02:00 AM – 02:15 AM)"
              >
                <Moon className="w-3.5 h-3.5 text-sky-500" />
                <span>Midnight Tea (15m)</span>
              </button>
            </div>
          )}

          {/* Right: Log Out of Shift Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-60"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Log Out Shift (Punch Out)</span>
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Log Out Confirmation Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center mb-4">
                <Square className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                Punch Out & End Shift?
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                Are you ready to clock out of your shift session? Total session logged time:{" "}
                <strong className="text-[#0F172A] dark:text-white font-mono">{formatTimer(elapsedShiftSeconds)}</strong>.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-800 dark:text-orange-300">
                💡 <em>Misclick grace window: You will have 15 minutes to resume your shift if you clocked out by accident.</em>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel / Stay on Shift
                </button>
                <button
                  type="button"
                  onClick={handleLogoutConfirm}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? "Logging Out..." : "Confirm Punch Out"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
