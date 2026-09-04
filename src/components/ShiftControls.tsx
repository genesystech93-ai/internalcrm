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
  X,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";

interface ShiftState {
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

export function ShiftControls() {
  const [shiftData, setShiftData] = useState<ShiftState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showCustomBreakModal, setShowCustomBreakModal] = useState<boolean>(false);
  const [customBreakReason, setCustomBreakReason] = useState<string>("");

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
    return () => clearInterval(interval);
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
    const res = await loginShiftAction();
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift session active.", type: "success" });
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleLogoutConfirm = async () => {
    if (!shiftData?.attendanceId) return;
    setLoading(true);
    setShowLogoutModal(false);
    const res = await logoutShiftAction(shiftData.attendanceId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Logged out. 15m undo window active.", type: "success" });
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleUndoLogout = async () => {
    if (!shiftData?.attendanceId) return;
    setLoading(true);
    const res = await undoLogoutAction(shiftData.attendanceId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift resumed without lost time!", type: "success" });
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleStartBreak = async (type: BreakType, customReason?: string) => {
    if (!shiftData?.attendanceId) return;
    setLoading(true);
    setShowCustomBreakModal(false);
    const res = await startBreakAction(shiftData.attendanceId, type, customReason);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Break started.", type: "success" });
      await fetchStatus();
    }
    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!shiftData?.activeBreak) return;
    setLoading(true);
    const res = await endBreakAction(shiftData.activeBreak.id);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Break ended. Shift resumed.", type: "success" });
      await fetchStatus();
    }
    setLoading(false);
  };

  return (
    <div className="w-full mb-6">
      {/* 15-Minute Misclick Grace Window Banner */}
      {shiftData?.isLoggedOut && shiftData.isUndoEligible && (
        <div className="liquid-glass rounded-3xl p-4 sm:p-5 mb-5 border border-orange-500/40 shadow-lg shadow-orange-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-[#EA580C] dark:text-[#FB923C] flex items-center justify-center shrink-0">
              <Hourglass className="w-5 h-5 animate-spin" style={{ animationDuration: "8s" }} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0F172A] dark:text-white">
                Accidental Log-Out Grace Window Active
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Logged out {shiftData.logoutElapsedMinutes}m ago. Misclick? Resume your shift without lost minutes or attendance penalties ({15 - shiftData.logoutElapsedMinutes}m remaining).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoLogout}
            disabled={loading}
            className="liquid-glass-button-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-orange-500/30 whitespace-nowrap"
          >
            <Undo2 className="w-4 h-4" />
            <span>Resume Shift / Undo Log-Out</span>
          </button>
        </div>
      )}

      {/* Main Shift Capsule Card */}
      <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Shift identity and live timer */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#FB923C] text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                  Campaign Floor Shift
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
                  {shiftData?.shiftStartTime || "19:00"} – {shiftData?.shiftEndTime || "04:00"}
                </span>
                {shiftData?.status && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      shiftData.status === "LATE"
                        ? "bg-amber-500/15 text-[#D97706] border border-amber-500/30"
                        : "bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    ● {shiftData.status}
                  </span>
                )}
              </div>

              {/* Status or timer readout */}
              {shiftData && !shiftData.isLoggedOut ? (
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    Session Duration:
                  </p>
                  <p className="font-mono text-base font-extrabold text-[#0F172A] dark:text-white tracking-wide">
                    {formatTimer(elapsedShiftSeconds)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Not Logged In to Shift. Click Log In to commence shift hours and lead generation.
                </p>
              )}
            </div>
          </div>

          {/* Center: Active Break Notice (If on break) */}
          {shiftData?.activeBreak && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-3 animate-pulse">
              <Coffee className="w-5 h-5 text-[#F59E0B] shrink-0" />
              <div>
                <p className="text-xs font-extrabold">
                  ON BREAK: {shiftData.activeBreak.breakType} {shiftData.activeBreak.customReason ? `(${shiftData.activeBreak.customReason})` : ""}
                </p>
                <p className="font-mono text-sm font-extrabold text-[#D97706] dark:text-[#FBBF24]">
                  Break Time: {formatBreakTimer(elapsedBreakSeconds)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleEndBreak}
                disabled={loading}
                className="liquid-glass-button-primary py-1.5 px-3 rounded-xl text-xs font-bold cursor-pointer ml-2"
              >
                End Break & Resume
              </button>
            </div>
          )}

          {/* Right: Operational Shift Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!shiftData || shiftData.isLoggedOut ? (
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="liquid-glass-button-primary px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Log In to Shift</span>
              </button>
            ) : (
              <>
                {/* Break Controls dropdown/buttons when not on break */}
                {!shiftData.activeBreak && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartBreak("FIRST_TEA")}
                      disabled={loading}
                      className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:border-orange-500/40 cursor-pointer"
                      title="1st Break: 09:30 PM – 09:45 PM (15m Evening Tea)"
                    >
                      <Coffee className="w-3.5 h-3.5 text-[#F97316]" />
                      <span>1st Tea (15m)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartBreak("DINNER")}
                      disabled={loading}
                      className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:border-emerald-500/40 cursor-pointer"
                      title="2nd Break: 11:30 PM – 12:15 AM (45m Main Dinner)"
                    >
                      <Utensils className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Dinner (45m)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartBreak("MIDNIGHT_TEA")}
                      disabled={loading}
                      className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:border-sky-500/40 cursor-pointer"
                      title="3rd Break: 02:00 AM – 02:15 AM (15m Midnight Coffee)"
                    >
                      <Moon className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Midnight Tea (15m)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomBreakModal(true)}
                      disabled={loading}
                      className="liquid-glass-button-secondary py-2 px-2.5 rounded-xl text-xs font-bold hover:border-slate-400 cursor-pointer"
                      title="Custom Bio / Training Break"
                    >
                      <span>Custom Break...</span>
                    </button>
                  </div>
                )}

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  disabled={loading}
                  className="liquid-glass-button-secondary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:border-red-500/40 hover:text-[#EF4444] cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Log Out</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Message toast */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
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
      </div>

      {/* Log Out Confirmation Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-[#EF4444] flex items-center justify-center mb-4">
                <Square className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                End Shift & Log Out?
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                Are you sure you want to log out of your current shift session? Current logged time:{" "}
                <strong className="text-[#0F172A] dark:text-white font-mono">{formatTimer(elapsedShiftSeconds)}</strong>.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-[#C2410C] dark:text-orange-300">
                💡 <em>Misclick protection: You will have a 15-minute grace window to resume your shift if logged out by mistake.</em>
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
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 cursor-pointer shadow-red-500/20"
                >
                  Confirm Log Out
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Custom Break Modal */}
      {showCustomBreakModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowCustomBreakModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-[#F97316] flex items-center justify-center">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">Take Custom Break</h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Bio, Restroom, Team Huddle or Training</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Reason for Break
                  </label>
                  <input
                    type="text"
                    value={customBreakReason}
                    onChange={(e) => setCustomBreakReason(e.target.value)}
                    placeholder="e.g. Bio Break, Supervisor Discussion, Call Huddle"
                    className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs placeholder-[#94A3B8] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleStartBreak("CUSTOM", "Bio Break")}
                    className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-bold text-center cursor-pointer"
                  >
                    Quick Bio (5-10m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartBreak("CUSTOM", "Team Huddle / Training")}
                    className="liquid-glass-button-secondary py-2 px-3 rounded-xl text-xs font-bold text-center cursor-pointer"
                  >
                    Team Training
                  </button>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomBreakModal(false)}
                    className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartBreak("CUSTOM", customBreakReason || "Custom Break")}
                    className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Start Break
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
