"use client";

import React, { useState, useEffect } from "react";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";
import { LeaveManagement } from "@/components/LeaveManagement";
import { getSalaryProfilesAction, updateSalaryProfileAction, SalaryProfileItem } from "@/app/actions/salary";
import { getIncentiveRulesAction, createIncentiveRuleAction, IncentiveRuleItem } from "@/app/actions/incentives";
import { getTeamsAction, createTeamAction, TeamItem } from "@/app/actions/teams";
import { getCampaignsAction, CampaignItem } from "@/app/actions/campaigns";
import { Users, Clock, Calendar, DollarSign, Award, Plus, Edit2, Check, AlertCircle } from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export function AdminWorkforceManager() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leaves" | "salaries" | "incentives">("attendance");

  // Salary Profiles state
  const [salaries, setSalaries] = useState<SalaryProfileItem[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newSalaryVal, setNewSalaryVal] = useState<number>(25000);

  // Incentive Rules state
  const [rules, setRules] = useState<IncentiveRuleItem[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [amountPerLead, setAmountPerLead] = useState("500.00");
  const [minLeadsTarget, setMinLeadsTarget] = useState("10");
  const [teamBonusPool, setTeamBonusPool] = useState("10000.00");

  // Teams state
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamTarget, setNewTeamTarget] = useState("200");
  const [newTeamPool, setNewTeamPool] = useState("10000");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    try {
      const [salList, ruleList, teamList, campList] = await Promise.all([
        getSalaryProfilesAction(),
        getIncentiveRulesAction(),
        getTeamsAction(),
        getCampaignsAction(),
      ]);
      setSalaries(salList);
      setRules(ruleList);
      setTeams(teamList);
      setCampaigns(campList);
      if (campList.length > 0 && !campaignId) {
        setCampaignId(campList[0].id);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSalary = async (userId: string) => {
    const res = await updateSalaryProfileAction(userId, newSalaryVal);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Salary updated.", type: "success" });
      setEditingUserId(null);
      await loadData();
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", newTeamName.trim());
    fd.append("targetVolume", newTeamTarget);
    fd.append("poolAmount", newTeamPool);

    const res = await createTeamAction(fd);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Team created.", type: "success" });
      setShowTeamModal(false);
      setNewTeamName("");
      await loadData();
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("campaignId", campaignId);
    fd.append("role", "AGENT");
    fd.append("amountPerLead", amountPerLead);
    fd.append("minLeadsTarget", minLeadsTarget);
    fd.append("teamBonusPool", teamBonusPool);

    const res = await createIncentiveRuleAction(fd);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Incentive rule saved.", type: "success" });
      setShowRuleModal(false);
      await loadData();
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl liquid-glass mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "attendance"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Floor Attendance & Breaks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leaves")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "leaves"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Leave Requests & Approvals</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("salaries")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "salaries"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Employee Salary Profiles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("incentives")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "incentives"
              ? "bg-[#F97316] text-white shadow-md shadow-orange-500/25"
              : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Incentive Rules & Team Pools</span>
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

      {/* Tab 1: Floor Attendance */}
      {activeTab === "attendance" && <AdminAttendanceBoard />}

      {/* Tab 2: Leave Management */}
      {activeTab === "leaves" && <LeaveManagement isAdmin={true} />}

      {/* Tab 3: Salary Profiles Master */}
      {activeTab === "salaries" && (
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                  Employee Base Salary Profile Master
                </h2>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Configure monthly base salaries and pay frequencies. Incentives are added on top of base pay.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Base Salary (₹)</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salaries.map((s) => (
                  <tr key={s.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#0F172A] dark:text-white">{s.name}</p>
                      <p className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8]">@{s.username}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold">{s.role}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#0F172A] dark:text-white">
                      {editingUserId === s.userId ? (
                        <input
                          type="number"
                          value={newSalaryVal}
                          onChange={(e) => setNewSalaryVal(Number(e.target.value))}
                          className="liquid-glass-input w-28 px-2 py-1 rounded-lg text-xs"
                        />
                      ) : (
                        `₹${s.baseSalary.toLocaleString("en-IN")}`
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">{s.payFrequency}</td>
                    <td className="py-3 px-3 text-[#64748B] dark:text-[#94A3B8]">{s.effectiveDate}</td>
                    <td className="py-3 px-3 text-right">
                      {editingUserId === s.userId ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateSalary(s.userId)}
                          className="liquid-glass-button-primary py-1 px-3 rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(s.userId);
                            setNewSalaryVal(s.baseSalary);
                          }}
                          className="liquid-glass-button-secondary py-1 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Incentive Rules & Team Pools */}
      {activeTab === "incentives" && (
        <div className="space-y-6">
          <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
                    <Award className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                    Custom Incentive Engine & Commission Rules
                  </h2>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Automated payout calculations: Individual commission per Approved lead and monthly Team Milestone bonus pools.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Incentive Rule</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3">Eligible Role</th>
                    <th className="py-2.5 px-3">Per-Lead Commission</th>
                    <th className="py-2.5 px-3">Team Monthly Target</th>
                    <th className="py-2.5 px-3">Team Bonus Pool</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-[#0F172A] dark:text-white">{r.campaignName}</td>
                      <td className="py-3 px-3 font-semibold">{r.role}</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#10B981]">${r.amountPerLead.toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono">{r.minLeadsTarget} Approved</td>
                      <td className="py-3 px-3 font-mono font-bold text-[#EA580C]">${r.teamBonusPool.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teams Roster */}
          <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-[#0284C7]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Active Floor Teams</h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Assigned Team Leaders and mapped dialer campaigns.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamModal(true)}
                className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-[#0F172A] dark:text-white">{t.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-[#0284C7]">
                      {t.memberCount} Members
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Team Lead: <strong className="text-[#0F172A] dark:text-white">{t.leaderName || "Unassigned"}</strong> (@{t.leaderUsername})
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                    Monthly Milestone: <strong className="font-mono text-[#0F172A] dark:text-white">{t.targetVolume} Leads</strong> $\rightarrow$ <strong className="font-mono text-[#10B981]">${t.poolAmount} Bonus Pool</strong>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.campaigns.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create Team Modal */}
          {showTeamModal && (
            <ModalPortal>
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white mb-4">
                    Create New Floor Team
                  </h3>

                  <form onSubmit={handleCreateTeam} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sales Team 1"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                          Monthly Target Volume
                        </label>
                        <input
                          type="number"
                          required
                          value={newTeamTarget}
                          onChange={(e) => setNewTeamTarget(e.target.value)}
                          className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                          Bonus Pool (₹)
                        </label>
                        <input
                          type="number"
                          step="50"
                          required
                          value={newTeamPool}
                          onChange={(e) => setNewTeamPool(e.target.value)}
                          className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowTeamModal(false)}
                        className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                      >
                        Save Team
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </ModalPortal>
          )}

          {/* Create Incentive Rule Modal */}
          {showRuleModal && (
            <ModalPortal>
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white mb-4">
                    Configure New Incentive Rule
                  </h3>

                  <form onSubmit={handleCreateRule} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                        Campaign
                      </label>
                      <select
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                      >
                        {campaigns.length === 0 ? (
                          <option value="">No campaigns available</option>
                        ) : (
                          campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                          Commission / Lead (₹)
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          required
                          value={amountPerLead}
                          onChange={(e) => setAmountPerLead(e.target.value)}
                          className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                          Team Target Volume
                        </label>
                        <input
                          type="number"
                          required
                          value={minLeadsTarget}
                          onChange={(e) => setMinLeadsTarget(e.target.value)}
                          className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                        Team Milestone Bonus Pool (₹)
                      </label>
                      <input
                        type="number"
                        step="50"
                        required
                        value={teamBonusPool}
                        onChange={(e) => setTeamBonusPool(e.target.value)}
                        className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-mono focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowRuleModal(false)}
                        className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs"
                      >
                        Save Rule
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </ModalPortal>
          )}
        </div>
      )}
    </div>
  );
}
