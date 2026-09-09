import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmployeeChatWidget } from "@/components/EmployeeChatWidget";
import { AgentDashboardHeader } from "@/components/AgentDashboardHeader";
import { AgentWorkspaceContainer } from "@/components/AgentWorkspaceContainer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ShiftHeaderWidget } from "@/components/ShiftHeaderWidget";
import { LogOut } from "lucide-react";

export default async function AgentDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Top Agent Navigation - Liquid Glass Header */}
      <header className="liquid-glass-header px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo size="md" />
          <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-700 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 text-[#EA580C] font-bold text-xs border border-orange-500/20 backdrop-blur-md hidden md:inline-block">
              👤 Agent Floor Workspace
            </span>
            {/* Live Interactive Shift Attendance Status & Punch Controls */}
            <ShiftHeaderWidget />
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10 space-y-6">
        {/* Animated Welcome Header */}
        <AgentDashboardHeader sessionName={session?.name || "Agent"} />

        {/* Tab-Segmented Agent Workspace (Decluttered, High-Focus Workspaces) */}
        <AgentWorkspaceContainer sessionName={session?.name || "Agent"} />
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
