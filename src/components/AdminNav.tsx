"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "@/app/actions/auth";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Settings,
  LogOut,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { EmployeeChatWidget } from "@/components/EmployeeChatWidget";
import { DatabaseStatusBadge } from "@/components/DatabaseStatusBadge";
import { NotificationBell } from "@/components/NotificationBell";
import { ShiftHeaderWidget } from "@/components/ShiftHeaderWidget";

interface AdminNavProps {
  sessionUser?: {
    name?: string;
    username?: string;
  } | null;
}

export function AdminNav({ sessionUser }: AdminNavProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      label: "Overview & Leads",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
    },
    {
      label: "Workforce & Staff",
      href: "/admin/employees",
      icon: Users,
      isActive: pathname.startsWith("/admin/employees"),
    },
    {
      label: "Reports & Auditing",
      href: "/admin/reports",
      icon: FileSpreadsheet,
      isActive: pathname.startsWith("/admin/reports"),
    },
    {
      label: "Settings & Security",
      href: "/admin/settings",
      icon: Settings,
      isActive: pathname.startsWith("/admin/settings"),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
      {/* Unified Single-Bar Corporate Header (56px) */}
      <div className="w-full max-w-[2160px] mx-auto px-3 sm:px-6 2xl:px-8 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand Identity + Clean Single-Tier Navigation */}
        <div className="flex items-center gap-5">
          <Logo size="md" />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" />

          {/* Desktop Navigation Links (Single Row) */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    tab.isActive
                      ? "bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/25 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      tab.isActive ? "text-[#F97316]" : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Operational Status, Floor Chat & Account Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Shift Punch & Status Widget */}
          <ShiftHeaderWidget />

          {/* Database Infrastructure Status */}
          <div className="hidden xl:block">
            <DatabaseStatusBadge />
          </div>

          {/* Floor Activity Notifications */}
          <NotificationBell />

          {/* Live Floor Chat Launcher */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("crm:open-chat"));
              }
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-[#EA580C] dark:text-slate-400 dark:hover:text-[#FB923C] hover:bg-orange-50 dark:hover:bg-slate-800/80 transition-colors relative cursor-pointer"
            title="Open Live Pulse Chat (Floor Supervisor)"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* User Account Info */}
          <div className="text-right hidden sm:block pl-1 border-l border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {sessionUser?.name || "Administrator"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              @{sessionUser?.username || "admin"}
            </p>
          </div>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Clean Corporate Log Out Button */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 bg-white dark:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
              title="Sign out of administrative session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Mobile Responsive Navigation Strip (< 768px only) */}
      <div className="md:hidden flex items-center gap-1 px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
        {navLinks.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                tab.isActive
                  ? "bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/25 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-3 h-3 ${
                  tab.isActive ? "text-[#F97316]" : "text-slate-400"
                }`}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Internal Staff Floor Messaging & Team Chat Widget */}
      <EmployeeChatWidget />
    </header>
  );
}
