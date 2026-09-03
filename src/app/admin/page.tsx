import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { LeadWorkspace } from "@/components/LeadWorkspace";
import { OperationalAnalytics } from "@/components/OperationalAnalytics";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { ActivityTimeline } from "@/components/ActivityTimeline";

export default async function AdminDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header with Sub-Portal Tabs */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Daily Operations & Leads Queue */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10">
        <AdminDashboardClient sessionName={session?.name || "Admin"} />

        {/* 1. Real-Time Operational Funnel Analytics & Conversion Metrics */}
        <OperationalAnalytics />

        {/* 2. Live Floor Activity Timeline */}
        <ActivityTimeline />

        {/* 3. Core Lead Review Queue & Decision Workspace (Dual-View: Kanban + Pretext Virtualized Table) */}
        <LeadWorkspace isAdmin={true} />
      </main>
    </div>
  );
}
