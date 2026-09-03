import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { AdminUserManagement } from "@/components/AdminUserManagement";
import { AdminWorkforceManager } from "@/components/AdminWorkforceManager";
import { Users } from "lucide-react";

export default async function AdminEmployeesPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Workforce & Employee Management */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-emerald-200/70 dark:border-emerald-500/30 text-xs font-bold text-[#10B981] dark:text-emerald-400 shadow-sm mb-2 backdrop-blur-md">
            <Users className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Dedicated Workforce Management Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Employee Accounts & Workforce Operations
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            Provision new employee credentials, assign operational roles, reset passwords, track floor attendance and breaks, review leaves, and configure salary profiles.
          </p>
        </div>

        {/* 1. Employee Accounts & Credentials (Add / Remove / Deactivate / Reset Passwords) */}
        <AdminUserManagement />

        {/* 2. Workforce Operations (Live Floor Attendance, Planned Leaves, Salary Profiles & Incentive Rules) */}
        <AdminWorkforceManager />
      </main>
    </div>
  );
}
