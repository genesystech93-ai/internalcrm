import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { AdminWorkforceHub } from "@/components/AdminWorkforceHub";
import { getAdminUsersAction } from "@/app/actions/admin-users";
import { getCampaignsAction } from "@/app/actions/campaigns";
import { getTeamsAction } from "@/app/actions/teams";
import { getSalaryProfilesAction } from "@/app/actions/salary";
import { Users } from "lucide-react";

export default async function AdminEmployeesPage() {
  const session = await getSession();

  // Pre-load data on the server so the 13 employees render instantaneously without waiting on client roundtrips
  const [initialUsers, initialCampaigns, initialTeams, initialSalaries] = await Promise.all([
    getAdminUsersAction(),
    getCampaignsAction(),
    getTeamsAction(),
    getSalaryProfilesAction(),
  ]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Workforce & Employee Hub (Device-Adaptive Screen Scaled) */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-4 relative z-10">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-1.5">
            <Users className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Workforce & Staff Operations Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Accounts, Salaries & Workforce Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Manage staff credentials, configure base compensation contracts, update bank routing information, and audit monthly attendance payroll.
          </p>
        </div>

        {/* Dynamic Segmented Workforce Hub (Zero Scroll Fatigue) */}
        <AdminWorkforceHub
          initialUsers={initialUsers}
          initialCampaigns={initialCampaigns}
          initialTeams={initialTeams}
          initialSalaries={initialSalaries}
        />
      </main>
    </div>
  );
}
