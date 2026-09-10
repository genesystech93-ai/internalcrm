import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { AdminWorkspaceContainer } from "@/components/AdminWorkspaceContainer";

export default async function AdminDashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header with Sub-Portal Tabs */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Device-Adaptive Screen Scaled Executive Command Center */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-3 space-y-3 relative z-10">
        <AdminWorkspaceContainer initialTab="leads" sessionName={session?.name || "Admin"} />
      </main>
    </div>
  );
}
