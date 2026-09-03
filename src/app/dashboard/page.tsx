import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShiftControls } from "@/components/ShiftControls";
import { AgentIncentiveTracker } from "@/components/AgentIncentiveTracker";
import { AgentPerformanceDashboard } from "@/components/AgentPerformanceDashboard";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { LeaveManagement } from "@/components/LeaveManagement";
import { EmployeeChatWidget } from "@/components/EmployeeChatWidget";
import { AgentDashboardHeader } from "@/components/AgentDashboardHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { LogOut } from "lucide-react";

export default async function AgentDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Top Agent Navigation - Liquid Glass Header */}
      <header className="liquid-glass-header px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-700 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-[#EA580C] font-bold text-xs border border-orange-500/20 backdrop-blur-md">
              👤 Agent Floor Workspace
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-xs font-mono text-[#475569] dark:text-[#94A3B8] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Floor Shift Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#0F172A] dark:text-white">{session?.name || "Agent"}</p>
            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">@{session?.username || "agent"}</p>
          </div>

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          <form action={logoutAction}>
            <button
              type="submit"
              className="liquid-glass-button-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:text-red-600 hover:border-red-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10">
        {/* Animated Welcome Header */}
        <AgentDashboardHeader sessionName={session?.name || "Agent"} />

        {/* Active Shift Controls (Log In / Log Out, 15m Grace Window & Multiple Breaks) */}
        <div data-section="shift-controls">
          <ShiftControls />
        </div>

        {/* Personal Target & Streak Performance Snapshot */}
        <AgentPerformanceDashboard />

        {/* Real-Time Commission & Milestone Tracker */}
        <AgentIncentiveTracker />

        {/* Lead Workspace: Dual-View Kanban & Pretext Virtualized Data Grid */}
        <div data-section="lead-workspace">
          <LeadWorkspace isAdmin={false} />
        </div>

        {/* Planned Leave Management */}
        <LeaveManagement isAdmin={false} />
      </main>

      {/* Internal Staff Floor Messaging & Team Chat Widget */}
      <div data-section="chat-widget">
        <EmployeeChatWidget />
      </div>

      {/* Mobile Bottom Tab Navigation (< 768px only) */}
      <MobileBottomNav />
    </div>
  );
}
