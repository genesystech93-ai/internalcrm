"use client";

import React, { useState, useEffect } from "react";
import { AdminAttendanceBoard } from "@/components/AdminAttendanceBoard";
import { LeaveManagement } from "@/components/LeaveManagement";
import { getSalaryProfilesAction, updateSalaryProfileAction, SalaryProfileItem } from "@/app/actions/salary";
import {
  getIncentiveRulesAction,
  createIncentiveRuleAction,
  deleteIncentiveRuleAction,
  toggleIncentiveRuleAction,
  IncentiveRuleItem,
} from "@/app/actions/incentives";
import {
  getTeamsAction,
  createTeamAction,
  assignTeamMembersAction,
  deleteTeamAction,
  getAssignableStaffAction,
  TeamItem,
  AssignableStaffItem,
} from "@/app/actions/teams";
import { getCampaignsAction, CampaignItem } from "@/app/actions/campaigns";
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  Award,
  Plus,
  Edit2,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  Power,
  UserCheck,
  UserPlus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { ModalPortal } from "./ModalPortal";

export function AdminWorkforceManager() {
  const [activeTab, setActiveTab] = useState<"attendance" | "leaves" | "salaries" | "incentives">("attendance");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Salary Profiles state
  const [salaries, setSalaries] = useState<SalaryProfileItem[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newSalaryVal, setNewSalaryVal] = useState<number>(25000);
  const [newFrequencyVal, setNewFrequencyVal] = useState<string>("MONTHLY");
  const [newEffectiveDateVal, setNewEffectiveDateVal] = useState<string>("");

  // Incentive Rules state
  const [rules, setRules] = useState<IncentiveRuleItem[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [amountPerLead, setAmountPerLead] = useState("500.00");
  const [minLeadsTarget, setMinLeadsTarget] = useState("10");
  const [teamBonusPool, setTeamBonusPool] = useState("10000.00");
  const [ruleRole, setRuleRole] = useState<"AGENT" | "CLOSER" | "TL">("AGENT");

  // Teams state
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamTarget, setNewTeamTarget] = useState("200");
  const [newTeamPool, setNewTeamPool] = useState("10000");

  // Manage Team Members state
  const [managingTeam, setManagingTeam] = useState<TeamItem | null>(null);
  const [assignableStaff, setAssignableStaff] = useState<AssignableStaffItem[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
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
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const handleEmployeeUpdate = () => {
      loadData();
    };
    window.addEventListener("crm:employee-updated", handleEmployeeUpdate);
    return () => window.removeEventListener("crm:employee-updated", handleEmployeeUpdate);
  }, []);

  const handleUpdateSalary = async (userId: string) => {
    const res = await updateSalaryProfileAction(
      userId,
      newSalaryVal,
      newFrequencyVal,
      newEffectiveDateVal
    );
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Salary profile updated.", type: "success" });
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

  const openManageMembers = async (team: TeamItem) => {
    setManagingTeam(team);
    setSelectedLeaderId(team.leaderId || "");
    setSelectedMemberIds(team.members.map((m) => m.id));
    setMemberSearch("");
    const staff = await getAssignableStaffAction();
    setAssignableStaff(staff);
  };

  const handleSaveTeamMembers = async () => {
    if (!managingTeam) return;
    setIsSavingMembers(true);
    const res = await assignTeamMembersAction(
      managingTeam.id,
      selectedMemberIds,
      selectedLeaderId || null
    );
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Team members assigned successfully.", type: "success" });
      setManagingTeam(null);
      await loadData();
    }
    setIsSavingMembers(false);
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? Associated members will be unassigned to General Floor.`)) return;
    const res = await deleteTeamAction(teamId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Team deleted.", type: "success" });
      await loadData();
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("campaignId", campaignId);
    fd.append("role", ruleRole);
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

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this incentive rule?")) return;
    const res = await deleteIncentiveRuleAction(ruleId);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Rule deleted.", type: "success" });
      await loadData();
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    const res = await toggleIncentiveRuleAction(ruleId, !currentStatus);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Rule status updated.", type: "success" });
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {salaries.length} Staff {salaries.length === 1 ? "Member" : "Members"}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Configure monthly base salaries and pay frequencies. Incentives are added on top of base pay.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadData()}
              disabled={isRefreshing}
              className="liquid-glass-button-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              title="Refresh Salary Profiles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#10B981]" : "text-[#64748B]"}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {salaries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#10B981] mx-auto mb-3">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white mb-1">
                No Staff Employees Registered Yet
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                When you create agents, closers, or team leads in the Employee Accounts panel above, their salary profiles will appear here automatically with editable base pay and pay frequencies.
              </p>
            </div>
          ) : (
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
                            className="liquid-glass-input w-28 px-2 py-1 rounded-lg text-xs font-mono font-bold"
                          />
                        ) : (
                          `₹${s.baseSalary.toLocaleString("en-IN")}`
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {editingUserId === s.userId ? (
                          <select
                            value={newFrequencyVal}
                            onChange={(e) => setNewFrequencyVal(e.target.value)}
                            className="liquid-glass-input px-2 py-1 rounded-lg text-xs font-mono font-semibold"
                          >
                            <option value="MONTHLY">MONTHLY</option>
                            <option value="BI_WEEKLY">BI_WEEKLY</option>
                            <option value="WEEKLY">WEEKLY</option>
                          </select>
                        ) : (
                          s.payFrequency
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {editingUserId === s.userId ? (
                          <input
                            type="date"
                            value={newEffectiveDateVal}
                            onChange={(e) => setNewEffectiveDateVal(e.target.value)}
                            className="liquid-glass-input px-2 py-1 rounded-lg text-xs font-mono"
                          />
                        ) : (
                          <span className="text-[#64748B] dark:text-[#94A3B8] font-mono">{s.effectiveDate}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {editingUserId === s.userId ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleUpdateSalary(s.userId)}
                              className="liquid-glass-button-primary py-1 px-3 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="liquid-glass-button-secondary py-1 px-2 rounded-lg text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId(s.userId);
                              setNewSalaryVal(s.baseSalary);
                              setNewFrequencyVal(s.payFrequency);
                              setNewEffectiveDateVal(s.effectiveDate);
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
          )}
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

            {/* Quick Incentive Setup Tip */}
            <div className="mb-5 p-3.5 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-xs text-[#0F172A] dark:text-white flex items-start gap-3">
              <div className="p-1 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-[#EA580C] dark:text-[#FB923C] block">
                  How to Enter Separate Incentives for Closers vs. Agents
                </span>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Click <strong>&quot;Create Incentive Rule&quot;</strong> and select <strong>Applicable Role: &quot;Agent&quot;</strong> for intake agents (e.g. ₹200/lead). Then click it again for the same campaign and select <strong>Applicable Role: &quot;Closer&quot;</strong> with the closer rate (e.g. ₹500/lead). When an admin approves a lead that has an assigned Closer, the system automatically pays both the intake Agent and the Closing Agent!
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3">Eligible Role</th>
                    <th className="py-2.5 px-3">Per-Lead Commission</th>
                    <th className="py-2.5 px-3">Team Target</th>
                    <th className="py-2.5 px-3">Team Bonus Pool</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                        No incentive rules created yet. Click &quot;Create Incentive Rule&quot; to define commissions for Closers, Agents, or Team Leads.
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#0F172A] dark:text-white">{r.campaignName}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              r.role === "CLOSER"
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25"
                                : r.role === "TL"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                : "bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border-emerald-500/25"
                            }`}
                          >
                            {r.role === "CLOSER" ? "🎯 Closer" : r.role === "TL" ? "⭐ Team Lead" : "📞 Agent"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#10B981]">₹{r.amountPerLead.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3 font-mono">{r.minLeadsTarget} Approved</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#EA580C]">₹{r.teamBonusPool.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleRule(r.id, r.isActive)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all ${
                              r.isActive
                                ? "bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/20"
                            }`}
                          >
                            {r.isActive ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete Rule"
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

          {/* Teams Roster */}
          <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-[#0284C7]">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Active Floor Teams</h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Assigned Team Leaders, mapped dialer campaigns, and assigned members.</p>
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
              {teams.length === 0 ? (
                <div className="col-span-full py-8 text-center text-[#94A3B8]">
                  No teams created yet. Click &quot;Create Team&quot; to establish operational floor units.
                </div>
              ) : (
                teams.map((t) => (
                  <div key={t.id} className="p-5 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-extrabold text-[#0F172A] dark:text-white text-sm">{t.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-500/10 text-[#0284C7] border border-sky-500/20">
                          {t.memberCount} Members
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                        Team Leader: <strong className="text-[#0F172A] dark:text-white">{t.leaderName || "Unassigned"}</strong> {t.leaderUsername ? `(@${t.leaderUsername})` : ""}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Monthly Milestone: <strong className="font-mono text-[#0F172A] dark:text-white">{t.targetVolume} Leads</strong> &rarr; <strong className="font-mono text-[#10B981]">₹{t.poolAmount} Bonus Pool</strong>
                      </p>

                      {/* Member Avatars / Chips */}
                      <div className="mt-3">
                        <p className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                          Assigned Staff Roster:
                        </p>
                        {t.members && t.members.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {t.members.map((m) => (
                              <span
                                key={m.id}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${
                                  m.id === t.leaderId
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                    : m.role === "CLOSER"
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                    : "bg-slate-100 dark:bg-slate-700 text-[#475569] dark:text-[#94A3B8] border-slate-200 dark:border-slate-600"
                                }`}
                              >
                                <span>{m.name}</span>
                                <span className="opacity-70 text-[9px]">({m.role})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-[#94A3B8]">No members assigned yet. Click &quot;Assign Members&quot; below.</p>
                        )}
                      </div>
                    </div>

                    {/* Team Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openManageMembers(t)}
                        className="liquid-glass-button-primary py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Members & Leader</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
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

          {/* Manage Team Members & Leader Modal */}
          {managingTeam && (
            <ModalPortal>
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] flex flex-col my-auto">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#F97316]" />
                        <span>Manage Team: {managingTeam.name}</span>
                      </h3>
                      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                        Designate team leader and assign floor agents to this team roster.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManagingTeam(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Team Leader Selector */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                      Designated Team Leader
                    </label>
                    <select
                      value={selectedLeaderId}
                      onChange={(e) => setSelectedLeaderId(e.target.value)}
                      className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                    >
                      <option value="">-- No Leader Assigned --</option>
                      {assignableStaff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name || staff.username} ({staff.role}) {staff.currentTeamName ? `- Currently: ${staff.currentTeamName}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Staff */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                        Floor Members ({selectedMemberIds.length} Selected)
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Check to assign to this team
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search staff by name or username..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="liquid-glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="flex-1 overflow-y-auto max-h-[260px] divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-1 mb-4 custom-scrollbar">
                    {assignableStaff
                      .filter((s) => {
                        if (!memberSearch) return true;
                        const term = memberSearch.toLowerCase();
                        return (
                          (s.name && s.name.toLowerCase().includes(term)) ||
                          s.username.toLowerCase().includes(term) ||
                          s.role.toLowerCase().includes(term)
                        );
                      })
                      .map((staff) => {
                        const isSelected = selectedMemberIds.includes(staff.id);
                        const isLeader = selectedLeaderId === staff.id;
                        const isCurrentTeam = staff.currentTeamId === managingTeam.id;

                        return (
                          <div
                            key={staff.id}
                            onClick={() => toggleMemberSelection(staff.id)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? "bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-[#F97316] focus:ring-[#F97316] border-slate-300 dark:border-slate-700 pointer-events-none"
                              />
                              <div>
                                <div className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                                  <span>{staff.name || staff.username}</span>
                                  {isLeader && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                  @{staff.username} • {staff.role}
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px]">
                              {isCurrentTeam ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Current Member
                                </span>
                              ) : staff.currentTeamName ? (
                                <span className="text-slate-400">
                                  In: {staff.currentTeamName}
                                </span>
                              ) : (
                                <span className="text-slate-400">Unassigned</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {assignableStaff.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No assignable staff found. Add employees in User Management first.
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setManagingTeam(null)}
                      disabled={isSavingMembers}
                      className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTeamMembers}
                      disabled={isSavingMembers}
                      className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                    >
                      {isSavingMembers ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Team Roster</span>
                      )}
                    </button>
                  </div>
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

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                        Applicable Role
                      </label>
                      <select
                        value={ruleRole}
                        onChange={(e) => setRuleRole(e.target.value as "AGENT" | "CLOSER" | "TL")}
                        className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs focus:outline-none"
                      >
                        <option value="AGENT">Agent</option>
                        <option value="CLOSER">Closer</option>
                        <option value="TL">Team Lead</option>
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
