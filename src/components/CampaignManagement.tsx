"use client";

import React, { useState, useEffect } from "react";
import {
  getCampaignsAction,
  createCampaignAction,
  updateCampaignShiftAction,
  CampaignItem,
} from "@/app/actions/campaigns";
import { Layers, Plus, Edit2, Check, AlertCircle } from "lucide-react";

export function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Campaign Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("19:00");
  const [shiftEndTime, setShiftEndTime] = useState("04:00");
  const [lateGraceMinutes, setLateGraceMinutes] = useState("15");
  const [commissionPerLead, setCommissionPerLead] = useState("15.00");

  // In-line Edit Shift Schedule
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editGrace, setEditGrace] = useState(15);
  const [editCommission, setEditCommission] = useState(15.0);

  const loadCampaigns = async () => {
    try {
      const data = await getCampaignsAction();
      setCampaigns(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("vertical", vertical);
    fd.append("shiftStartTime", shiftStartTime);
    fd.append("shiftEndTime", shiftEndTime);
    fd.append("lateGraceMinutes", lateGraceMinutes);
    fd.append("commissionPerLead", commissionPerLead);

    const res = await createCampaignAction(fd);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Campaign created.", type: "success" });
      setShowCreateModal(false);
      setName("");
      setVertical("");
      await loadCampaigns();
    }
    setLoading(false);
  };

  const handleSaveShift = async (campId: string) => {
    setLoading(true);
    const res = await updateCampaignShiftAction(campId, editStartTime, editEndTime, editGrace, editCommission);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Shift schedule updated.", type: "success" });
      setEditingCampId(null);
      await loadCampaigns();
    }
    setLoading(false);
  };

  const startEdit = (c: CampaignItem) => {
    setEditingCampId(c.id);
    setEditStartTime(c.shiftStartTime);
    setEditEndTime(c.shiftEndTime);
    setEditGrace(c.lateGraceMinutes);
    setEditCommission(c.commissionPerLead);
  };

  return (
    <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Campaign Management & Shift Schedules
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Configure operational hours, custom shifts, and per-lead commission rates for each calling campaign.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {message && (
        <div
          className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            message.type === "success"
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

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Campaign & Vertical</th>
              <th className="py-2.5 px-3">Shift Operating Hours</th>
              <th className="py-2.5 px-3">Late Grace Window</th>
              <th className="py-2.5 px-3">Commission / Lead</th>
              <th className="py-2.5 px-3">Performance</th>
              <th className="py-2.5 px-3 text-right">Schedule Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.map((c) => {
              const isEditing = editingCampId === c.id;

              return (
                <tr key={c.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-extrabold text-[#0F172A] dark:text-white">{c.name}</p>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{c.vertical || "General"}</p>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="liquid-glass-input px-1.5 py-1 rounded text-xs w-24"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="liquid-glass-input px-1.5 py-1 rounded text-xs w-24"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-[#0F172A] dark:text-white">
                        {c.shiftStartTime} – {c.shiftEndTime}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editGrace}
                        onChange={(e) => setEditGrace(Number(e.target.value))}
                        className="liquid-glass-input px-1.5 py-1 rounded text-xs w-16"
                      />
                    ) : (
                      <span>{c.lateGraceMinutes} mins</span>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-[#10B981]">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.50"
                        value={editCommission}
                        onChange={(e) => setEditCommission(Number(e.target.value))}
                        className="liquid-glass-input px-1.5 py-1 rounded text-xs w-20"
                      />
                    ) : (
                      `$${c.commissionPerLead.toFixed(2)}`
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className="text-[11px] font-semibold text-[#0F172A] dark:text-white">
                      {c.approvedLeads} / {c.totalLeads} Approved
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] block">
                      ({c.totalLeads > 0 ? Math.round((c.approvedLeads / c.totalLeads) * 100) : 0}% verification rate)
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => handleSaveShift(c.id)}
                        disabled={loading}
                        className="liquid-glass-button-primary py-1 px-3 rounded-lg text-xs font-bold"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="liquid-glass-button-secondary py-1 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Shift</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white mb-4">
              Add New Campaign & Shift Schedule
            </h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Senior Medicare Care"
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Industry Vertical
                </label>
                <input
                  type="text"
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  placeholder="e.g. Healthcare, Insurance, Energy"
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Late Grace (Mins)
                  </label>
                  <input
                    type="number"
                    required
                    value={lateGraceMinutes}
                    onChange={(e) => setLateGraceMinutes(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Commission / Lead ($)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={commissionPerLead}
                    onChange={(e) => setCommissionPerLead(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
