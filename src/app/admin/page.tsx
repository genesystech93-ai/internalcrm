import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { AdminWorkspaceContainer } from "@/components/AdminWorkspaceContainer";

export default async function AdminDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header with Sub-Portal Tabs */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Executive Decision Center & Decluttered Tabs */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10 space-y-6">
        <AdminDashboardClient sessionName={session?.name || "Admin"} />

        {/* Tab-Segmented Admin Workspace (Decluttered, High-Focus Workspaces) */}
        <AdminWorkspaceContainer initialTab="leads" />
      </main>
    </div>
  );
}
