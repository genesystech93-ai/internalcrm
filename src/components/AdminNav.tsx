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
  Clock,
} from "lucide-react";
import { EmployeeChatWidget } from "@/components/EmployeeChatWidget";

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
      label: "Employees & Workforce",
      href: "/admin/employees",
      icon: Users,
      isActive: pathname.startsWith("/admin/employees"),
    },
    {
      label: "Performance & Reports",
      href: "/admin/reports",
      icon: FileSpreadsheet,
      isActive: pathname.startsWith("/admin/reports"),
    },
    {
      label: "System & Settings",
      href: "/admin/settings",
      icon: Settings,
      isActive: pathname.startsWith("/admin/settings"),
    },
  ];

  return (
    <header className="sticky top-0 z-50">
      {/* Top Bar: Brand, Session & Quick Actions */}
      <div className="liquid-glass-header px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] font-bold text-xs border border-orange-500/20 backdrop-blur-md">
              👑 Admin Command Center
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-xs font-mono text-[#475569] dark:text-[#94A3B8] backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Floor Shift Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#0F172A] dark:text-white">
              {sessionUser?.name || "Administrator"}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
              @{sessionUser?.username || "admin"}
            </p>
          </div>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          <form action={logoutAction}>
            <button
              type="submit"
              className="liquid-glass-button-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Sub-Navigation Strip: Purpose-Built Portal Tabs */}
      <div className="liquid-glass px-6 py-2 border-b border-white/60 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  tab.isActive
                    ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
                    : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.isActive ? "text-white" : "text-[#F97316]"}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Internal Staff Floor Messaging & Team Chat Widget */}
      <EmployeeChatWidget />
    </header>
  );
}
