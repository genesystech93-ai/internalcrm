"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("genesoft-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkMode = savedTheme === "dark" || (!savedTheme && prefersDark);
    
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    if (nextTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("genesoft-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("genesoft-theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl liquid-glass-button-secondary flex items-center justify-center opacity-50 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`liquid-glass-button-secondary w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Night Shift Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#F97316] animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-[#64748B] animate-in spin-in-180 duration-300" />
      )}
    </button>
  );
}
