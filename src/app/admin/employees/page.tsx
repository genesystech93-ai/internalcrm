import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { AdminUserManagement } from "@/components/AdminUserManagement";
import { AdminWorkforceManager } from "@/components/AdminWorkforceManager";
import { getAdminUsersAction } from "@/app/actions/admin-users";
import { getCampaignsAction } from "@/app/actions/campaigns";
import { getTeamsAction } from "@/app/actions/teams";
import { Users } from "lucide-react";

export default async function AdminEmployeesPage() {
  const session = await getSession();

  // Pre-load data on the server so the 13 employees render instantaneously without waiting on client roundtrips
  const [initialUsers, initialCampaigns, initialTeams] = await Promise.all([
    getAdminUsersAction(),
    getCampaignsAction(),
    getTeamsAction(),
  ]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Workforce & Employee Management (Device-Adaptive Screen Scaled) */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-4 relative z-10">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-1.5">
            <Users className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Workforce & Staff Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Accounts & Workforce Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Provision employee credentials, assign roles, reset passwords, audit attendance, and configure salary profiles.
          </p>
        </div>

        {/* 1. Employee Accounts & Credentials (Add / Remove / Deactivate / Reset Passwords) */}
        <AdminUserManagement
          initialUsers={initialUsers}
          initialCampaigns={initialCampaigns}
          initialTeams={initialTeams}
        />

        {/* 2. Workforce Operations (Live Floor Attendance, Planned Leaves, Salary Profiles & Incentive Rules) */}
        <AdminWorkforceManager />
      </main>
    </div>
  );
}
