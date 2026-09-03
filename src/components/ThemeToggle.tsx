"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("genesoft-theme");
    const savedAuto = localStorage.getItem("genesoft-theme-auto");

    // Auto dark mode: between 7PM and 4AM (shift hours)
    const hours = new Date().getHours();
    const isShiftHours = hours >= 19 || hours < 4;

    if (savedAuto === "true" || (!savedTheme && !savedAuto)) {
      // Auto mode is on (default behavior)
      setIsAutoMode(true);
      if (isShiftHours) {
        setIsDark(true);
        document.documentElement.classList.add("dark");
        if (!savedAuto && !savedTheme) {
          // First visit during shift — show toast
          setShowToast("🌙 Night mode activated — shift started");
          setTimeout(() => setShowToast(null), 3500);
        }
      } else {
        setIsDark(false);
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("genesoft-theme-auto", "true");
    } else {
      // Manual override
      setIsAutoMode(false);
      const isDarkMode = savedTheme === "dark";
      setIsDark(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // Periodic auto-check every minute for shift boundary transitions
  useEffect(() => {
    if (!isAutoMode) return;

    const interval = setInterval(() => {
      const hours = new Date().getHours();
      const shouldBeDark = hours >= 19 || hours < 4;
      if (shouldBeDark !== isDark) {
        setIsDark(shouldBeDark);
        if (shouldBeDark) {
          document.documentElement.classList.add("dark");
          setShowToast("🌙 Night mode activated — shift started");
        } else {
          document.documentElement.classList.remove("dark");
          setShowToast("☀️ Light mode restored — shift ended");
        }
        setTimeout(() => setShowToast(null), 3500);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isAutoMode, isDark]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    setIsAutoMode(false); // Manual override disables auto
    localStorage.setItem("genesoft-theme-auto", "false");
    if (nextTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("genesoft-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("genesoft-theme", "light");
    }
  };

  const enableAutoMode = () => {
    setIsAutoMode(true);
    localStorage.setItem("genesoft-theme-auto", "true");
    localStorage.removeItem("genesoft-theme");
    const hours = new Date().getHours();
    const shouldBeDark = hours >= 19 || hours < 4;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setShowToast(shouldBeDark ? "🌙 Auto: Night shift mode" : "☀️ Auto: Day mode");
    setTimeout(() => setShowToast(null), 2500);
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl liquid-glass-button-secondary flex items-center justify-center opacity-50 ${className}`} />
    );
  }

  return (
    <>
      <div className="relative group">
        <button
          type="button"
          onClick={toggleTheme}
          onDoubleClick={enableAutoMode}
          className={`liquid-glass-button-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${className} ${
            isAutoMode ? "ring-1 ring-[#F97316]/40" : ""
          }`}
          title={
            isAutoMode
              ? "Auto Mode (7PM-4AM Dark) — Click to override, Double-click for auto"
              : isDark
              ? "Switch to Light Mode — Double-click for auto"
              : "Switch to Night Shift Dark Mode — Double-click for auto"
          }
          aria-label="Toggle theme"
        >
          {isAutoMode ? (
            <Monitor className="w-4 h-4 text-[#F97316] animate-in spin-in-180 duration-300" />
          ) : isDark ? (
            <Sun className="w-4 h-4 text-[#F97316] animate-in spin-in-180 duration-300" />
          ) : (
            <Moon className="w-4 h-4 text-[#64748B] animate-in spin-in-180 duration-300" />
          )}
        </button>
        {/* Tiny auto badge */}
        {isAutoMode && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#F97316] border border-white dark:border-slate-900 animate-pulse" />
        )}
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700 shadow-xl text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
            <span>{showToast}</span>
          </div>
        </div>
      )}
    </>
  );
}
