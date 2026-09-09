import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { OperationalAnalytics } from "@/components/OperationalAnalytics";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";

export default async function AdminDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header with Sub-Portal Tabs */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Daily Operations & Leads Queue */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10 space-y-8">
        <AdminDashboardClient sessionName={session?.name || "Admin"} />

        {/* 1. Real-Time Operational Funnel Analytics & Conversion Metrics */}
        <OperationalAnalytics />

        {/* 2. Workforce Floor Attendance, Shift Totals & Auto Shift Management */}
        <AdminAttendanceBoard />

        {/* 3. Live Floor Activity Timeline */}
        <ActivityTimeline />

        {/* 4. Core Lead Review Queue & Decision Workspace (Dual-View: Kanban + Pretext Virtualized Table) */}
        <LeadWorkspace isAdmin={true} />
      </main>
    </div>
  );
}
