"use client";

import React, { useState, useEffect, useActionState } from "react";
import {
  getAdminUsersAction,
  createEmployeeAction,
  updateEmployeeAction,
  toggleEmployeeStatusAction,
  deleteEmployeeAction,
  adminChangePasswordAction,
  UserManagementItem,
} from "@/app/actions/admin-users";
import { getCampaignsAction, CampaignItem } from "@/app/actions/campaigns";
import { getTeamsAction, TeamItem } from "@/app/actions/teams";
import {
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  User,
  RefreshCw,
  X,
  Lock,
  UserPlus,
  Trash2,
  Filter,
  Loader2,
  Edit2,
  CreditCard,
  Building2,
} from "lucide-react";
import { Role } from "@prisma/client";
import { ModalPortal } from "@/components/ModalPortal";
import { SalaryAndBankingModal } from "@/components/SalaryAndBankingModal";
import { getSalaryProfilesAction, SalaryProfileItem } from "@/app/actions/salary";

interface AdminUserManagementProps {
  initialUsers?: UserManagementItem[];
  initialCampaigns?: CampaignItem[];
  initialTeams?: TeamItem[];
}

export function AdminUserManagement({
  initialUsers = [],
  initialCampaigns = [],
  initialTeams = [],
}: AdminUserManagementProps = {}) {
  const [users, setUsers] = useState<UserManagementItem[]>(initialUsers);
  const [loading, setLoading] = useState(initialUsers.length === 0);
  const [togglingUsername, setTogglingUsername] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Salary & Banking Modal state
  const [salaryProfiles, setSalaryProfiles] = useState<SalaryProfileItem[]>([]);
  const [selectedSalaryStaff, setSelectedSalaryStaff] = useState<SalaryProfileItem | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Change Password Modal
  const [selectedUser, setSelectedUser] = useState<UserManagementItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [state, formAction, isPending] = useActionState(adminChangePasswordAction, null);

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<Role>("AGENT");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns);
  const [addCampaign, setAddCampaign] = useState(initialCampaigns[0]?.name || "");
  const [teams, setTeams] = useState<TeamItem[]>(initialTeams);
  const [addTeamId, setAddTeamId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Employee state
  const [editingUser, setEditingUser] = useState<UserManagementItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("AGENT");
  const [editTeamId, setEditTeamId] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getAdminUsersAction(),
        getCampaignsAction(),
        getTeamsAction(),
        getSalaryProfilesAction(),
      ]);

      if (results[0].status === "fulfilled" && results[0].value.length > 0) {
        setUsers(results[0].value);
      } else {
        // Fallback to direct REST endpoint if action returned empty
        try {
          const res = await fetch("/api/employees");
          if (res.ok) {
            const data = await res.json();
            if (data.employees && data.employees.length > 0) {
              setUsers(data.employees);
            }
          }
        } catch {
          // ignore
        }
      }

      if (results[1].status === "fulfilled") {
        setCampaigns(results[1].value);
        if (results[1].value.length > 0 && !addCampaign) {
          setAddCampaign(results[1].value[0].name);
        }
      }

      if (results[2].status === "fulfilled") {
        setTeams(results[2].value);
      }

      if (results[3].status === "fulfilled") {
        setSalaryProfiles(results[3].value);
      }
    } catch (err) {
      console.error("Failed to load staff roster:", err);
    } finally {
      setLoading(false);
    }
  };

  const openSalaryBankModal = (u: UserManagementItem) => {
    const profile = salaryProfiles.find(
      (s) => s.userId === u.id || s.username.toLowerCase() === u.username.toLowerCase()
    );
    if (profile) {
      setSelectedSalaryStaff(profile);
    } else {
      setSelectedSalaryStaff({
        id: `sal-${u.id}`,
        userId: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        baseSalary: 25000,
        payFrequency: "MONTHLY",
        effectiveDate: new Date().toISOString().split("T")[0],
        accountType: "SAVINGS",
      });
    }
    setIsSalaryModalOpen(true);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setSelectedUser(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const generateRandomPassword = (forNew = false) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (forNew) {
      setAddPassword(pass);
    } else {
      setNewPassword(pass);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setNotification(null);

    const formData = new FormData();
    formData.append("username", addUsername);
    formData.append("name", addName);
    formData.append("role", addRole);
    formData.append("email", addEmail);
    formData.append("password", addPassword);
    formData.append("campaignId", addCampaign);
    if (addTeamId) {
      formData.append("teamId", addTeamId);
    }

    const res = await createEmployeeAction(formData);
    if (res.error) {
      setNotification({ type: "error", text: res.error });
    } else {
      setNotification({ type: "success", text: res.message || "Employee created." });
      setIsAddModalOpen(false);
      setAddUsername("");
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddTeamId("");
      await loadUsers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm:employee-updated"));
      }
    }
    setIsCreating(false);
  };

  const openEditUser = (u: UserManagementItem) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditRole(u.role);
    setEditTeamId(u.teamId || "NONE");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setNotification(null);

    const formData = new FormData();
    formData.append("username", editingUser.username);
    formData.append("name", editName);
    formData.append("email", editEmail);
    formData.append("role", editRole);
    formData.append("teamId", editTeamId);

    const res = await updateEmployeeAction(formData);
    if (res.error) {
      setNotification({ type: "error", text: res.error });
    } else {
      setNotification({ type: "success", text: res.message || "Employee updated." });
      setEditingUser(null);
      await loadUsers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm:employee-updated"));
      }
    }
    setIsUpdatingUser(false);
  };

  const handleToggleStatus = async (username: string) => {
    setTogglingUsername(username);
    const res = await toggleEmployeeStatusAction(username);
    if (res.error) {
      setNotification({ type: "error", text: res.error });
    } else {
      setNotification({ type: "success", text: res.message || "Status updated." });
      await loadUsers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm:employee-updated"));
      }
    }
    setTogglingUsername(null);
  };

  const handleDeleteEmployee = async (username: string, name: string) => {
    if (!confirm(`Are you sure you want to remove employee @${username} (${name})? This action will unregister their CRM access.`)) {
      return;
    }
    const res = await deleteEmployeeAction(username);
    if (res.error) {
      setNotification({ type: "error", text: res.error });
    } else {
      setNotification({ type: "success", text: res.message || "Employee removed." });
      await loadUsers();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm:employee-updated"));
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter === "ALL") return true;
    return u.role === roleFilter;
  });

  return (
    <div id="user-management" className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Employee Workforce & User Accounts
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Create new staff logins, assign roles, reset credentials, or deactivate employees. Admins possess sole creation authority.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            generateRandomPassword(true);
          }}
          className="liquid-glass-button-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-md shadow-orange-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            notification.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {state?.success && state.message && (
        <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {state?.error && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
          <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3 text-[#F97316]" />
          <span>Filter:</span>
        </span>
        {["ALL", "AGENT", "CLOSER", "TL", "ADMIN"].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roleFilter === r
                ? "bg-[#F97316] text-white shadow-sm"
                : "bg-white/60 dark:bg-slate-800/60 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white border border-slate-200/60 dark:border-slate-700"
            }`}
          >
            {r === "ALL" ? `All Staff (${users.length})` : r === "TL" ? "Team Lead" : r === "CLOSER" ? "Closer" : r === "AGENT" ? "Agent" : "Admin"}
          </button>
        ))}
        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="liquid-glass-button-secondary p-1.5 rounded-xl ml-auto text-xs flex items-center justify-center cursor-pointer"
          title="Refresh Staff Roster"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-700 text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
              <th className="py-3 px-3">Employee</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Team & Campaign</th>
              <th className="py-3 px-3">Account Status</th>
              <th className="py-3 px-3 text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#F97316]" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Loading employee workforce roster...
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                      No employees match the selected filter.
                    </p>
                    {users.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRoleFilter("ALL")}
                        className="text-[11px] font-bold text-[#F97316] hover:underline cursor-pointer"
                      >
                        Reset Filter to View All Staff ({users.length})
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.username} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-[#0F172A] dark:text-white">{u.name}</p>
                        <p className="font-mono text-[10px] text-[#F97316] font-semibold">@{u.username}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === "ADMIN"
                          ? "bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20"
                          : u.role === "CLOSER"
                          ? "bg-emerald-500/10 text-[#10B981] dark:text-emerald-400 border border-emerald-500/20"
                          : u.role === "TL"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                          : "bg-sky-500/10 text-[#0284C7] dark:text-[#38BDF8] border border-sky-500/20"
                      }`}
                    >
                      {u.role === "TL" ? "Team Lead" : u.role}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#0F172A] dark:text-white">
                      {u.teamName || "Unassigned Floor"}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      {u.campaignName || "General Campaign"}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <button
                      type="button"
                      disabled={u.username === "admin" || togglingUsername === u.username}
                      onClick={() => handleToggleStatus(u.username)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                        u.isActive
                          ? "bg-emerald-500/10 text-[#10B981] border border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                      } ${u.username === "admin" ? "cursor-default opacity-80" : ""}`}
                      title={u.username === "admin" ? "Admin cannot be deactivated" : "Click to toggle Active / Inactive"}
                    >
                      {togglingUsername === u.username ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-orange-500" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-[#10B981]" : "bg-rose-500"}`} />
                      )}
                      <span>{togglingUsername === u.username ? "Updating..." : u.isActive ? "Active" : "Deactivated"}</span>
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditUser(u)}
                        className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 hover:border-orange-500/40 hover:text-[#EA580C] cursor-pointer"
                        title="Edit Employee Name, Email, Role & Team"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#EA580C]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openSalaryBankModal(u)}
                        className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        title="Edit Employee Base Salary & Bank Routing Details"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Salary & Bank</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword("");
                        }}
                        className="liquid-glass-button-secondary py-1.5 px-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 hover:border-orange-500/40 hover:text-[#EA580C] cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#F97316]" />
                        <span>Reset Pass</span>
                      </button>

                      {u.username !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(u.username, u.name)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove Employee from CRM"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Add New Employee */}
      {isAddModalOpen && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsAddModalOpen(false);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center text-[#F97316]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">Add New Employee</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Provision credentials and assign floor operations role.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Johnathan Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    placeholder="e.g. jsmith"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as Role)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="CLOSER">Closer</option>
                    <option value="TL">Team Lead</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="jsmith@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Assigned Campaign
                  </label>
                  <select
                    value={addCampaign}
                    onChange={(e) => setAddCampaign(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  >
                    {campaigns.length === 0 ? (
                      <option value="General Floor">General Floor</option>
                    ) : (
                      campaigns.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Floor Team (Optional)
                  </label>
                  <select
                    value={addTeamId}
                    onChange={(e) => setAddTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  >
                    <option value="">-- No Team (General) --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => generateRandomPassword(true)}
                    className="text-[10px] font-bold text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isCreating ? "Creating..." : "Save Employee"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal 3: Edit Employee Profile */}
      {editingUser && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingUser(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center text-[#EA580C]">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">Edit Employee Profile</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Update credentials, system role, and assigned team.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              {/* Username display (read-only) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Username (Fixed Login Handle)
                </label>
                <div className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  @{editingUser.username}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Employee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="employee@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Role *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    disabled={editingUser.username === "admin"}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all disabled:opacity-60"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="CLOSER">Closer</option>
                    <option value="TL">Team Lead (TL)</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                    Assigned Floor Team
                  </label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  >
                    <option value="NONE">-- No Team (General) --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isUpdatingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isUpdatingUser ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal 2: Reset Password Modal */}
      {selectedUser && (
        <ModalPortal>
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedUser(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar my-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100/70 dark:hover:bg-slate-800 text-[#64748B] dark:text-[#94A3B8] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center text-[#F97316]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">Reset User Password</h3>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Updating security credentials for <strong className="text-[#EA580C] dark:text-[#FB923C]">@{selectedUser.username}</strong>
                </p>
              </div>
            </div>

            <form
              action={formAction}
              onSubmit={() => {
                setSelectedUser(null);
                setTimeout(loadUsers, 500);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="username" value={selectedUser.username} />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Target Username
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-[#0F172A] dark:text-white">
                  @{selectedUser.username} ({selectedUser.name})
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => generateRandomPassword(false)}
                    className="text-[11px] font-bold text-[#F97316] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    name="newPassword"
                    required
                    minLength={6}
                    maxLength={128}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="liquid-glass-button-primary flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isPending ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal 3: Edit Staff Salary & Banking Details */}
      <SalaryAndBankingModal
        isOpen={isSalaryModalOpen}
        staff={selectedSalaryStaff}
        onClose={() => setIsSalaryModalOpen(false)}
        onSuccess={async () => {
          setNotification({ type: "success", text: "Employee salary & banking profile updated successfully." });
          const salaryRes = await getSalaryProfilesAction();
          if (salaryRes) setSalaryProfiles(salaryRes);
        }}
      />
    </div>
  );
}
