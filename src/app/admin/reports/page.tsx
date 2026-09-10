import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { EmployeePerformanceReports } from "@/components/EmployeePerformanceReports";
import { FileSpreadsheet } from "lucide-react";

export default async function AdminReportsPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Executive Reports & CSV Export Center (Device-Adaptive Screen Scaled) */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-4 relative z-10">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Executive Auditing & Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Staff Performance Reports & Data Export Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Monitor verified sales deals, conversion velocity, productive shift hours, and download 1-click CSV datasets.
          </p>
        </div>

        {/* Comprehensive Performance Table with 1-Click CSV Exports */}
        <EmployeePerformanceReports />
      </main>
    </div>
  );
}
