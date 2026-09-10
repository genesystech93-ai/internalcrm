"use client";

import React, { useState, useEffect } from "react";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";
import { AdminWorkforceManager } from "@/components/AdminWorkforceManager";
import { OperationalAnalytics } from "@/components/OperationalAnalytics";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export type AdminWorkspaceTab = "leads" | "attendance" | "payroll" | "analytics";

interface AdminWorkspaceContainerProps {
  initialTab?: AdminWorkspaceTab;
  sessionName?: string;
}

export function AdminWorkspaceContainer({
  initialTab = "leads",
  sessionName = "Admin",
}: AdminWorkspaceContainerProps) {
  const [activeTab, setActiveTab] = useState<AdminWorkspaceTab>(initialTab);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Sync with saved Focus Mode preference in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_admin_focus_mode");
      if (saved === "true") {
        setIsFocusMode(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem("crm_admin_focus_mode", String(nextVal));
      } catch {
        // Ignore
      }
      return nextVal;
    });
  };

  // Sync URL hash with activeTab
  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "");
        if (["leads", "attendance", "payroll", "analytics"].includes(hash)) {
          setActiveTab(hash as AdminWorkspaceTab);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tabId: AdminWorkspaceTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.location.hash = tabId;
    }
  };

  return (
    <div className="space-y-3">
      {/* Unified Executive Command Hub (Sleek Header + Integrated Tab Switcher + Focus Mode) */}
      <AdminDashboardClient
        sessionName={sessionName}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isFocusMode={isFocusMode}
        onToggleFocusMode={handleToggleFocusMode}
      />

      {/* Dynamic Tab Workspace Container (No duplicate secondary tab bar) */}
      <div className="min-h-[480px]">
        {activeTab === "leads" && (
          <div id="leads-workspace" className="animate-in fade-in duration-150">
            <LeadWorkspace isAdmin={true} />
          </div>
        )}

        {activeTab === "attendance" && (
          <div id="attendance-workspace" className="animate-in fade-in duration-150">
            <AdminAttendanceBoard />
          </div>
        )}

        {activeTab === "payroll" && (
          <div id="payroll-workspace" className="animate-in fade-in duration-150">
            <AdminWorkforceManager initialTab="salaries" />
          </div>
        )}

        {activeTab === "analytics" && (
          <div id="analytics-workspace" className="space-y-4 animate-in fade-in duration-150">
            <OperationalAnalytics />
            <ActivityTimeline />
          </div>
        )}
      </div>
    </div>
  );
}
