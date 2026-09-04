"use client";

import React, { useState, useEffect } from "react";
import {
  getCampaignsAction,
  createCampaignAction,
  updateCampaignAction,
  deleteCampaignAction,
  toggleCampaignStatusAction,
  CampaignItem,
} from "@/app/actions/campaigns";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  X,
  Power,
  ShieldAlert,
} from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

export function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Campaign Modal Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("19:00");
  const [shiftEndTime, setShiftEndTime] = useState("04:00");
  const [lateGraceMinutes, setLateGraceMinutes] = useState("15");
  const [commissionPerLead, setCommissionPerLead] = useState("500.00");

  // Edit Campaign Modal
  const [editingCampaign, setEditingCampaign] = useState<CampaignItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editVertical, setEditVertical] = useState("");
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");
  const [editGraceMins, setEditGraceMins] = useState("15");
  const [editCommissionRate, setEditCommissionRate] = useState("500.00");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Campaign Modal
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignItem | null>(null);
  const [confirmDeleteLeads, setConfirmDeleteLeads] = useState(false);

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

  const openEditModal = (c: CampaignItem) => {
    setEditingCampaign(c);
    setEditName(c.name);
    setEditVertical(c.vertical || "");
    setEditShiftStart(c.shiftStartTime);
    setEditShiftEnd(c.shiftEndTime);
    setEditGraceMins(String(c.lateGraceMinutes));
    setEditCommissionRate(String(c.commissionPerLead));
    setEditIsActive(c.isActive);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setLoading(true);
    const res = await updateCampaignAction(editingCampaign.id, {
      name: editName,
      vertical: editVertical || null,
      shiftStartTime: editShiftStart,
      shiftEndTime: editShiftEnd,
      lateGraceMinutes: parseInt(editGraceMins, 10) || 15,
      commissionPerLead: parseFloat(editCommissionRate) || 15,
      isActive: editIsActive,
    });
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Campaign updated.", type: "success" });
      setEditingCampaign(null);
      await loadCampaigns();
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deletingCampaign) return;
    setLoading(true);
    const res = await deleteCampaignAction(
      deletingCampaign.id,
      confirmDeleteLeads || deletingCampaign.totalLeads === 0
    );
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Campaign deleted.", type: "success" });
      setDeletingCampaign(null);
      setConfirmDeleteLeads(false);
      await loadCampaigns();
    }
    setLoading(false);
  };

  const handleToggleStatus = async (c: CampaignItem) => {
    setLoading(true);
    const res = await toggleCampaignStatusAction(c.id, !c.isActive);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Status updated.", type: "success" });
      await loadCampaigns();
    }
    setLoading(false);
  };

  return (
    <div id="shifts" className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800 scroll-mt-24">
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
            Configure operational hours, custom shifts, commissions, and manage active or deleted campaigns.
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
          className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-in fade-in duration-200 ${
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
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Shift Operating Hours</th>
              <th className="py-2.5 px-3">Late Grace Window</th>
              <th className="py-2.5 px-3">Commission / Lead (₹)</th>
              <th className="py-2.5 px-3">Performance</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No campaigns found. Click &quot;New Campaign&quot; to create one.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <p className="font-extrabold text-[#0F172A] dark:text-white">{c.name}</p>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{c.vertical || "General"}</p>
                  </td>

                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(c)}
                      title={`Click to ${c.isActive ? "archive" : "activate"} campaign`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                        c.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                      <span>{c.isActive ? "Active" : "Archived"}</span>
                    </button>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-[#0F172A] dark:text-white">
                      {c.shiftStartTime} – {c.shiftEndTime}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span>{c.lateGraceMinutes} mins</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-[#10B981]">
                    ₹{c.commissionPerLead.toLocaleString("en-IN")}
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
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Full Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:border-orange-500/30"
                        title="Edit Campaign Name, Hours & Commission"
                      >
                        <Edit2 className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                        <span>Edit</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingCampaign(c);
                          setConfirmDeleteLeads(false);
                        }}
                        className="py-1.5 px-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 cursor-pointer transition-all"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

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
                      Commission / Lead (₹)
                    </label>
                    <input
                      type="number"
                      step="10"
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
        </ModalPortal>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingCampaign(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                    Edit Campaign
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Modify campaign properties, operational shift hours, and commission.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdate} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Industry Vertical
                  </label>
                  <input
                    type="text"
                    value={editVertical}
                    onChange={(e) => setEditVertical(e.target.value)}
                    placeholder="e.g. Healthcare, Insurance"
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
                      value={editShiftStart}
                      onChange={(e) => setEditShiftStart(e.target.value)}
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
                      value={editShiftEnd}
                      onChange={(e) => setEditShiftEnd(e.target.value)}
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
                      value={editGraceMins}
                      onChange={(e) => setEditGraceMins(e.target.value)}
                      className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                      Commission / Lead (₹)
                    </label>
                    <input
                      type="number"
                      step="10"
                      required
                      value={editCommissionRate}
                      onChange={(e) => setEditCommissionRate(e.target.value)}
                      className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Campaign is Active (visible in Lead Entry & Dialer)
                    </span>
                  </label>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingCampaign(null)}
                    className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Campaign Confirmation Modal */}
      {deletingCampaign && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeletingCampaign(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setDeletingCampaign(null)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                Delete Campaign?
              </h3>

              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete campaign{" "}
                <strong className="text-[#0F172A] dark:text-white">{deletingCampaign.name}</strong>?
              </p>

              {deletingCampaign.totalLeads > 0 ? (
                <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Warning: Associated Leads Present</span>
                  </div>
                  <p className="leading-relaxed">
                    This campaign contains <strong className="font-mono">{deletingCampaign.totalLeads}</strong> lead(s).
                    Deleting will permanently purge these associated leads and unbind attendance records.
                  </p>
                  <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer text-slate-800 dark:text-white">
                    <input
                      type="checkbox"
                      checked={confirmDeleteLeads}
                      onChange={(e) => setConfirmDeleteLeads(e.target.checked)}
                      className="w-4 h-4 rounded text-red-500 focus:ring-red-500"
                    />
                    <span>Yes, delete this campaign and all associated data</span>
                  </label>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  This campaign has 0 leads. It can be safely deleted with no data loss.
                </p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingCampaign(null)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || (deletingCampaign.totalLeads > 0 && !confirmDeleteLeads)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 cursor-pointer shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
