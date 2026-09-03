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

      {/* Main Content Area: Dedicated Executive Reports & CSV Export Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-purple-200/70 dark:border-purple-500/30 text-xs font-bold text-purple-700 dark:text-purple-400 shadow-sm mb-2 backdrop-blur-md">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Executive Reporting & Data Export Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            Staff Performance Reports & Data Export Center
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            Monitor verified deals, employee conversion rates, productive shift hours, and late marks. Download 1-click CSV datasets for payroll and floor reviews.
          </p>
        </div>

        {/* Comprehensive Performance Table with 1-Click CSV Exports */}
        <EmployeePerformanceReports />
      </main>
    </div>
  );
}
