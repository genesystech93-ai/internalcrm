import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { CompanySettingsCard } from "@/components/CompanySettingsCard";
import { AdminIpManagement } from "@/components/AdminIpManagement";
import { CampaignManagement } from "@/components/CampaignManagement";
import { ClientManagementCard } from "@/components/ClientManagementCard";
import { DatabaseHealthCard } from "@/components/DatabaseHealthCard";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Settings & Security Center (Device-Adaptive Screen Scaled) */}
      <main className="flex-1 w-full max-w-[2160px] mx-auto px-2.5 sm:px-5 lg:px-6 2xl:px-8 py-4 relative z-10">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-[#EA580C] dark:text-[#FB923C] mb-1.5">
            <Settings className="w-3.5 h-3.5 text-[#F97316]" />
            <span>System, Security & Infrastructure</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            System, Branding & Infrastructure Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Database connection diagnostic, company logo branding, WAN IP access rules, shift operating windows, and SLA net terms.
          </p>
        </div>

        {/* 1. Real-Time Database Connection & Infrastructure Diagnostic Monitor */}
        <DatabaseHealthCard />

        {/* 2. Company Branding & Official Logo Upload Center */}
        <CompanySettingsCard />

        {/* 3. Global IP Whitelist & Restricted Login Guard */}
        <AdminIpManagement />

        {/* 4. Campaign Management & Configurable Shift Operating Hours */}
        <CampaignManagement />

        {/* 5. Corporate Clients & Net Terms Approval Window Manager */}
        <ClientManagementCard />
      </main>
    </div>
  );
}
