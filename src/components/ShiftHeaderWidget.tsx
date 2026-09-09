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
  Play,
  Square,
  Undo2,
  Loader2,
  Zap,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";
import { ShiftState } from "./ShiftAttendanceBar";

export function ShiftHeaderWidget() {
  const [shiftData, setShiftData] = useState<ShiftState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
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
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatBreakTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogin = async () => {
    setLoading(true);
    const res = await loginShiftAction();
    if (!res.error) {
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleLogoutConfirm = async () => {
    setLoading(true);
    setShowLogoutModal(false);
    const res = await logoutShiftAction(shiftData?.attendanceId);
    if (!res.error) {
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleUndoLogout = async () => {
    setLoading(true);
    const res = await undoLogoutAction(shiftData?.attendanceId);
    if (!res.error) {
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!shiftData?.activeBreak) return;
    setLoading(true);
    const res = await endBreakAction(shiftData.activeBreak.id);
    if (!res.error) {
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  const handleStartBreak = async (type: BreakType) => {
    if (!shiftData?.attendanceId) return;
    setLoading(true);
    const res = await startBreakAction(shiftData.attendanceId, type);
    if (!res.error) {
      await fetchStatus();
      notifyUpdate();
    }
    setLoading(false);
  };

  // 1. GRACE PERIOD (Accidental Log-out)
  if (shiftData?.isLoggedOut && shiftData.isUndoEligible) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-mono font-bold text-orange-700 dark:text-orange-400">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
          <span>Grace: {Math.max(1, 15 - shiftData.logoutElapsedMinutes)}m left</span>
        </div>
        <button
          type="button"
          onClick={handleUndoLogout}
          disabled={loading}
          className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white cursor-pointer shadow-sm disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
          <span>Resume Shift</span>
        </button>
      </div>
    );
  }

  // 2. NOT CLOCKED IN STATE
  if (!shiftData || shiftData.isLoggedOut) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-700 dark:text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Shift Not Punched</span>
        </div>
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] hover:from-[#C2410C] hover:to-[#EA580C] text-white cursor-pointer shadow-md shadow-orange-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
          title="Punch in to record shift attendance and start work"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-current text-yellow-200" />
          )}
          <span>Punch In Shift</span>
        </button>
      </div>
    );
  }

  // 3. ON BREAK STATE
  if (shiftData.activeBreak) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 animate-pulse">
          <Coffee className="w-3.5 h-3.5 text-amber-600" />
          <span>Break: {formatBreakTimer(elapsedBreakSeconds)}</span>
        </div>
        <button
          type="button"
          onClick={handleEndBreak}
          disabled={loading}
          className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 bg-[#EA580C] hover:bg-[#C2410C] text-white cursor-pointer shadow-sm disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
          <span>Resume Shift</span>
        </button>
      </div>
    );
  }

  // 4. ACTIVE SHIFT STATE
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Shift: {formatTimer(elapsedShiftSeconds)}</span>
      </div>

      <div className="hidden lg:flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleStartBreak("FIRST_TEA")}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:border-orange-500/40 text-[11px] font-bold cursor-pointer"
          title="Start 15m Tea Break"
        >
          <Coffee className="w-3.5 h-3.5 text-orange-500" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowLogoutModal(true)}
        disabled={loading}
        className="px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-60"
        title="Punch out of shift"
      >
        <Square className="w-3 h-3 fill-current" />
        <span className="hidden sm:inline">Punch Out</span>
      </button>

      {/* Confirmation Modal */}
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
