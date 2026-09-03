"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Users, Clock, Mail, Check, AlertCircle, X, ShieldCheck } from "lucide-react";
import { getClientsAction, createClientAction, ClientItem } from "@/app/actions/clients";
import { NetTermsType } from "@/lib/client-store";

export function ClientManagementCard() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [defaultNetTerms, setDefaultNetTerms] = useState<NetTermsType>("NET_14");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    const list = await getClientsAction();
    setClients(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("contactPerson", contactPerson);
    formData.append("email", email);
    formData.append("defaultNetTerms", defaultNetTerms);

    const res = await createClientAction(formData);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(`Client "${name}" registered successfully!`);
      setName("");
      setContactPerson("");
      setEmail("");
      setIsModalOpen(false);
      loadClients();
      setTimeout(() => setSuccess(null), 3500);
    }
  };

  const getNetTermsBadge = (terms: NetTermsType) => {
    switch (terms) {
      case "NET_7":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "NET_14":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "NET_21":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "NET_30":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="liquid-glass-card p-6 sm:p-7 rounded-3xl mb-8">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-orange-500/15 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/30">
              <Building2 className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Corporate Clients & Net Terms Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage buyers, assign lead submission quotas, and set standard approval turnaround windows (Net 7, 14, 21, 30 days).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="liquid-glass-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Add Client Organization</span>
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Clients Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading client registry...</div>
      ) : clients.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No corporate clients registered yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Client Organization" to register your first buyer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                    {client.name}
                  </h4>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getNetTermsBadge(
                      client.defaultNetTerms
                    )}`}
                  >
                    {client.defaultNetTerms.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  {client.contactPerson && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{client.contactPerson}</span>
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">
                  Total Leads: <strong className="text-slate-800 dark:text-slate-200">{client.totalLeadsCount}</strong>
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {client.pendingApprovalsCount} Pending
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register New Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-slate-700 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span>Register Client Organization</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Healthcare Buyers LLC"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person & Title
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. David Miller (Intake Director)"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. dmiller@apexhealthcare.com"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Net Approval Window
                </label>
                <select
                  value={defaultNetTerms}
                  onChange={(e) => setDefaultNetTerms(e.target.value as NetTermsType)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="NET_7">Net 7 (7 Calendar Days)</option>
                  <option value="NET_14">Net 14 (14 Calendar Days - Standard)</option>
                  <option value="NET_21">Net 21 (21 Calendar Days)</option>
                  <option value="NET_30">Net 30 (30 Calendar Days)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="liquid-glass-button px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
