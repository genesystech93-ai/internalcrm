import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmployeeChatWidget } from "@/components/EmployeeChatWidget";
import { AgentDashboardHeader } from "@/components/AgentDashboardHeader";
import { AgentWorkspaceContainer } from "@/components/AgentWorkspaceContainer";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ShiftHeaderWidget } from "@/components/ShiftHeaderWidget";
import { LogOut, Headphones } from "lucide-react";

export default async function AgentDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Top Agent Navigation - Unified Corporate Header (56px) */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="w-full max-w-[2160px] mx-auto px-3 sm:px-6 2xl:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-5">
            <Logo size="md" />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] font-semibold text-xs border border-orange-500/20 hidden md:inline-flex">
                <Headphones className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Sales Operations Floor</span>
              </span>
              {/* Live Interactive Shift Attendance Status & Punch Controls */}
              <ShiftHeaderWidget />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="text-right hidden sm:block border-l border-slate-200 dark:border-slate-800 pl-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {session?.name || "Agent"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                @{session?.username || "agent"}
              </p>
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Clean Corporate Log Out Button */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 bg-white dark:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                title="Sign out of agent session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area: Device-Adaptive Screen Scaled */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-3 space-y-3 relative z-10">
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
