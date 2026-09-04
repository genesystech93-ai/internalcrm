"use client";

import React, { useState, useEffect } from "react";
import {
  getIpStatusAction,
  toggleIpRestrictionAction,
  addWhitelistedIpAction,
  deleteWhitelistedIpAction,
  toggleWhitelistedIpAction,
} from "@/app/actions/admin-ip";
import { Plus, Trash2, Globe, Check, AlertCircle, ToggleLeft, ToggleRight, Wifi, Loader2 } from "lucide-react";

interface WhitelistedIpRecord {
  id: string;
  ipAddress: string;
  description?: string | null;
  isActive: boolean;
}

export function AdminIpManagement() {
  const [currentLocalIp, setCurrentLocalIp] = useState<string>("Detecting...");
  const [globalPublicIp, setGlobalPublicIp] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [ipList, setIpList] = useState<WhitelistedIpRecord[]>([]);
  const [newIp, setNewIp] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadStatus = async () => {
    try {
      const data = await getIpStatusAction();
      setCurrentLocalIp(data.currentClientIp);
      setIsRestricted(data.isRestricted);
      setIpList(data.whitelistedIps as WhitelistedIpRecord[]);
    } catch {
      setCurrentLocalIp("127.0.0.1");
    }

    // Detect actual Global Public IP from client network
    try {
      const res = await fetch("https://api64.ipify.org?format=json");
      const json = await res.json();
      if (json?.ip) {
        setGlobalPublicIp(json.ip);
      }
    } catch {
      // Offline fallback
      setGlobalPublicIp(null);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleToggleRestriction = async () => {
    setLoading(true);
    const res = await toggleIpRestrictionAction(!isRestricted);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setIsRestricted(!isRestricted);
      setMessage({ type: "success", text: res.message || "Global IP restriction updated." });
    }
    setLoading(false);
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;

    setLoading(true);
    const fd = new FormData();
    fd.append("ipAddress", newIp.trim());
    fd.append("description", newDescription.trim() || "Global Static IP Entry");

    const res = await addWhitelistedIpAction(fd);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: res.message || "Global IP added to whitelist." });
      setNewIp("");
      setNewDescription("");
      await loadStatus();
    }
    setLoading(false);
  };

  const handleWhitelistGlobalIp = async () => {
    const targetIp = globalPublicIp || currentLocalIp;
    if (!targetIp || targetIp === "Detecting...") return;

    const fd = new FormData();
    fd.append("ipAddress", targetIp);
    fd.append("description", "Admin Current Global Public IP (WAN)");
    const res = await addWhitelistedIpAction(fd);
    if (res.success) {
      setMessage({ type: "success", text: `Global Public IP (${targetIp}) successfully added to whitelist.` });
      await loadStatus();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteWhitelistedIpAction(id);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Removed." });
      await loadStatus();
    }
  };

  const handleToggleStatus = async (id: string) => {
    const res = await toggleWhitelistedIpAction(id);
    if (res.success) {
      await loadStatus();
    }
  };

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Global IP Whitelist & Access Restriction</h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Enforce employee CRM logins strictly from authorized **Global Public Static IPs** (Office Leased Lines & WANs).
            {" "}<strong className="text-[#EA580C]">Admin can log in from anywhere</strong> without restriction.
          </p>
        </div>

        {/* Master Restriction Toggle */}
        <button
          type="button"
          onClick={handleToggleRestriction}
          disabled={loading}
          className={`liquid-glass-card px-4 py-2 rounded-2xl flex items-center gap-3 border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${isRestricted
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-[#64748B] dark:text-[#94A3B8]"
            }`}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          ) : isRestricted ? (
            <ToggleRight className="w-6 h-6 text-[#10B981]" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-[#94A3B8]" />
          )}
          <div className="text-left text-xs">
            <p className="font-bold">
              {loading ? "Updating IP Guard..." : isRestricted ? "Global IP Guard: ENFORCED" : "Global IP Guard: DISABLED"}
            </p>
            <p className="text-[10px] opacity-75">
              {isRestricted ? "Restricted to whitelisted Global IPs" : "Open access across all IPs"}
            </p>
          </div>
        </button>
      </div>

      {/* Alert message */}
      {message && (
        <div
          className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
            }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Global IP Detection Banner */}
      <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-[#0284C7]">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
              Your Detected Global Public IP (WAN)
            </p>
            <p className="font-mono text-sm font-extrabold text-[#0F172A] dark:text-white">
              {globalPublicIp ? (
                <span>{globalPublicIp} <span className="text-[10px] font-sans font-normal text-emerald-600 dark:text-emerald-400 ml-1">● Live WAN Detected</span></span>
              ) : (
                <span>{currentLocalIp} <span className="text-[10px] font-sans font-normal text-[#94A3B8] ml-1">(Localhost Egress)</span></span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleWhitelistGlobalIp}
          className="liquid-glass-button-secondary py-2 px-3.5 rounded-xl text-xs font-bold text-[#F97316] hover:border-orange-500/40 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Whitelist This Global IP</span>
        </button>
      </div>

      {/* Add Custom Global IP Form */}
      <form onSubmit={handleAddIp} className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6">
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
            Global Public IP Address (WAN)
          </label>
          <input
            type="text"
            required
            maxLength={45}
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="e.g. 182.72.10.45 or 49.207.210.15"
            className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono placeholder-[#94A3B8] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
            Location / Branch Description
          </label>
          <input
            type="text"
            maxLength={100}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g. Main Office Leased Line, Branch Floor B"
            className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs placeholder-[#94A3B8] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="liquid-glass-button-primary w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{loading ? "Adding..." : "Add Global IP"}</span>
          </button>
        </div>
      </form>

      {/* Whitelisted Global IPs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Global IP (WAN)</th>
              <th className="py-2.5 px-3">Branch / Line Description</th>
              <th className="py-2.5 px-3">Enforcement</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ipList.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-[#94A3B8]">
                  No Global IP addresses whitelisted yet.
                </td>
              </tr>
            ) : (
              ipList.map((ip) => (
                <tr key={ip.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#0F172A] dark:text-white">
                    {ip.ipAddress}
                  </td>
                  <td className="py-3 px-3 text-[#475569] dark:text-[#94A3B8] font-medium">
                    {ip.description || "Global Public Static IP"}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ip.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${ip.isActive
                          ? "bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-200/60 dark:bg-slate-700 text-[#64748B] dark:text-[#94A3B8] border border-slate-300 dark:border-slate-600"
                        }`}
                    >
                      {ip.isActive ? "● Active Whitelist" : "○ Disabled"}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(ip.id)}
                      className="p-1.5 rounded-lg text-[#EF4444] hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Whitelisted Global IP"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
