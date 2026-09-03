import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { CompanySettingsCard } from "@/components/CompanySettingsCard";
import { AdminIpManagement } from "@/components/AdminIpManagement";
import { CampaignManagement } from "@/components/CampaignManagement";
import { ClientManagementCard } from "@/components/ClientManagementCard";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Universal Admin Navigation Header */}
      <AdminNav sessionUser={session} />

      {/* Main Content Area: Dedicated Settings & Security Center */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 relative z-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-orange-200/70 dark:border-orange-500/30 text-xs font-bold text-[#EA580C] dark:text-[#FB923C] shadow-sm mb-2 backdrop-blur-md">
            <Settings className="w-3.5 h-3.5 text-[#F97316]" />
            <span>Corporate Branding & Security Settings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            System, Branding & Security Settings
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-medium">
            Upload company logo, customize corporate information, configure Global Public WAN IP whitelisting, and set campaign shift operating hours.
          </p>
        </div>

        {/* 1. Company Branding & Official Logo Upload Center */}
        <CompanySettingsCard />

        {/* 2. Global IP Whitelist & Restricted Login Guard */}
        <AdminIpManagement />

        {/* 3. Campaign Management & Configurable Shift Operating Hours */}
        <CampaignManagement />

        {/* 4. Corporate Clients & Net Terms Approval Window Manager */}
        <ClientManagementCard />
      </main>
    </div>
  );
}
