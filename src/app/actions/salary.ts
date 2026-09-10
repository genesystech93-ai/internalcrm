"use server";
// Genesoft Infotech CRM - Employee Salary Management Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { listStoredUsers } from "@/lib/user-store";
import { getCurrentMonthKey, parseMonthDateRange, getDefaultAvailableMonths, formatMonthLabel } from "@/lib/date-utils";

export interface SalaryProfileItem {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  baseSalary: number;
  payFrequency: string;
  effectiveDate: string;
}

// In-memory salary overrides for offline development
const devSalaryOverrides = new Map<string, { baseSalary: number; payFrequency: string; effectiveDate: string }>();

export async function getSalaryProfilesAction(): Promise<SalaryProfileItem[]> {
  const session = await getSession();
  if (session && session.role !== "ADMIN") return [];

  try {
    // 1. Fetch all staff members (agents, closers, TLs, etc. - all non-admin users)
    const users = await prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
      },
      include: {
        salaryProfile: true,
      },
      orderBy: { name: "asc" },
    });

    if (users.length > 0) {
      return users.map((u) => {
        const profile = u.salaryProfile;
        const override = devSalaryOverrides.get(u.id) || devSalaryOverrides.get(u.username);
        return {
          id: profile ? profile.id : `sal-${u.id}`,
          userId: u.id,
          username: u.username,
          name: u.name,
          role: u.role,
          baseSalary: profile
            ? Number(profile.baseSalary)
            : override
            ? override.baseSalary
            : 25000.0,
          payFrequency: profile
            ? profile.payFrequency
            : override
            ? override.payFrequency
            : "MONTHLY",
          effectiveDate: profile
            ? (profile.effectiveDate instanceof Date ? profile.effectiveDate.toISOString().split("T")[0] : new Date(profile.effectiveDate).toISOString().split("T")[0])
            : override
            ? override.effectiveDate
            : (u.createdAt instanceof Date ? u.createdAt.toISOString().split("T")[0] : new Date(u.createdAt).toISOString().split("T")[0]),
        };
      });
    }

    return [];
  } catch {
    // Database offline fallback: Dynamically generate salary profiles for all real workforce users from user-store
    const staff = listStoredUsers().filter((u) => u.role !== "ADMIN");
    return staff.map((u) => {
      const override = devSalaryOverrides.get(u.id) || devSalaryOverrides.get(u.username);
      return {
        id: `sal-${u.id}`,
        userId: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        baseSalary: override ? override.baseSalary : 25000.0,
        payFrequency: override ? override.payFrequency : "MONTHLY",
        effectiveDate: override ? override.effectiveDate : (u.createdAt ? u.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
      };
    });
  }
}

export async function updateSalaryProfileAction(
  userId: string,
  baseSalary: number,
  payFrequency = "MONTHLY",
  effectiveDateStr?: string
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();

  try {
    await prisma.salaryProfile.upsert({
      where: { userId },
      update: { baseSalary, payFrequency, effectiveDate },
      create: { userId, baseSalary, payFrequency, effectiveDate },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Salary profile updated successfully." };
  } catch {
    // Offline Dev Fallback: Persist in memory so the Admin sees immediate updates
    const targetDate = effectiveDateStr || new Date().toISOString().split("T")[0];
    devSalaryOverrides.set(userId, {
      baseSalary,
      payFrequency,
      effectiveDate: targetDate,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Salary profile updated successfully (Dev Mode)." };
  }
}

export interface SalaryAdjustmentRecord {
  bonus?: number;
  bonusRemarks?: string | null;
  deductions?: number;
  deductionRemarks?: string | null;
  status?: "PENDING" | "PROCESSING" | "DISBURSED";
  disbursedAt?: string | null;
  paymentMethod?: string | null;
  utrRef?: string | null;
}

export interface AugustLedgerItem {
  userId: string;
  name: string;
  username: string;
  role: string;
  team: string;
  bank: string | null;
  ifsc: string | null;
  accountNo: string | null;
  accountType: string | null;
  presentDays: number;
  absentDays: number;
  basicSalary: number;
  augNetSalary: number;
  bonus?: number;
  bonusRemarks?: string | null;
  deductions?: number;
  deductionRemarks?: string | null;
  finalPayout?: number;
  status?: "PENDING" | "PROCESSING" | "DISBURSED";
  disbursedAt?: string | null;
  paymentMethod?: string | null;
  utrRef?: string | null;
}

// In-memory store for payroll adjustments & disbursement status (dev fallback)
const devAdjustmentsMap = new Map<string, Record<string, SalaryAdjustmentRecord>>();

async function getPayrollAdjustmentsForMonth(month: string): Promise<Record<string, SalaryAdjustmentRecord>> {
  try {
    const key = `payroll_adjustments_${month}`;
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (setting) {
      return JSON.parse(setting.value);
    }
  } catch {}
  return devAdjustmentsMap.get(month) || {};
}

async function savePayrollAdjustmentsForMonth(month: string, adjustments: Record<string, SalaryAdjustmentRecord>) {
  devAdjustmentsMap.set(month, adjustments);
  try {
    const key = `payroll_adjustments_${month}`;
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(adjustments) },
      create: { key, value: JSON.stringify(adjustments) },
    });
  } catch {}
}

export async function getAugustPayrollLedgerAction(filterUserId?: string): Promise<AugustLedgerItem[]> {
  const session = await getSession();
  if (session && session.role !== "ADMIN") return [];

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "august_2026_payroll_ledger" },
    });
    if (setting) {
      let list: AugustLedgerItem[] = JSON.parse(setting.value);
      if (filterUserId && filterUserId !== "ALL") {
        list = list.filter((i) => i.userId === filterUserId || i.username.toLowerCase() === filterUserId.toLowerCase());
      }
      return list;
    }
  } catch {
    // Offline Dev Fallback
  }
  return [];
}

export interface MonthlyPayrollResponse {
  selectedMonth: string;
  selectedUserId: string;
  items: AugustLedgerItem[];
  allStaff: Array<{ id: string; name: string; username: string; role: string }>;
  availableMonths: Array<{ value: string; label: string }>;
  totals: {
    staffCount: number;
    totalPresent: number;
    totalAbsent: number;
    grossBasePayroll: number;
    totalNetPayout: number;
    totalBonus: number;
    totalDeductions: number;
    totalDisbursed: number;
  };
}

export async function getMonthlySalaryLedgerAction(
  month?: string,
  filterUserId = "ALL"
): Promise<MonthlyPayrollResponse> {
  const currentMonthKey = getCurrentMonthKey();
  const targetMonth = month && month !== "ALL" ? month : currentMonthKey;

  const session = await getSession();
  const availableMonths = getDefaultAvailableMonths();

  // Allow ADMIN to see all, and non-admin to see only their own record
  if (!session || (session.role !== "ADMIN" && session.userId !== filterUserId)) {
    return {
      selectedMonth: targetMonth,
      selectedUserId: filterUserId,
      items: [],
      allStaff: [],
      availableMonths,
      totals: {
        staffCount: 0,
        totalPresent: 0,
        totalAbsent: 0,
        grossBasePayroll: 0,
        totalNetPayout: 0,
        totalBonus: 0,
        totalDeductions: 0,
        totalDisbursed: 0,
      },
    };
  }

  try {
    // Fetch all staff users
    const staffUsers = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true, name: true, username: true, role: true },
      orderBy: { name: "asc" },
    });

    const allStaff = staffUsers.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
    }));

    let rawItems: AugustLedgerItem[] = [];

    if (targetMonth === "2026-08") {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "august_2026_payroll_ledger" },
      });
      if (setting) {
        rawItems = JSON.parse(setting.value);
      }
    } else {
      // Dynamic month date range calculation
      const dateRange = parseMonthDateRange(targetMonth) || parseMonthDateRange(currentMonthKey)!;
      const mStart = dateRange.start;
      const mEnd = dateRange.end;
      const daysInMonth = dateRange.daysInMonth;

      const usersWithSal = await prisma.user.findMany({
        where: { role: { not: "ADMIN" } },
        include: {
          salaryProfile: true,
          team: true,
          attendances: {
            where: { shiftDate: { gte: mStart, lte: mEnd } },
          },
        },
        orderBy: { name: "asc" },
      });

      // Preserve banking info from master ledger
      const bankInfoMap = new Map<string, { bank: string | null; ifsc: string | null; accountNo: string | null; accountType: string | null }>();
      try {
        const augSet = await prisma.systemSetting.findUnique({ where: { key: "august_2026_payroll_ledger" } });
        if (augSet) {
          const augList: AugustLedgerItem[] = JSON.parse(augSet.value);
          augList.forEach((a) => bankInfoMap.set(a.userId, { bank: a.bank, ifsc: a.ifsc, accountNo: a.accountNo, accountType: a.accountType }));
        }
      } catch {}

      rawItems = usersWithSal.map((u) => {
        const base = u.salaryProfile ? Number(u.salaryProfile.baseSalary) : 25000;
        const present = u.attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
        const half = u.attendances.filter((a) => a.status === "HALF_DAY").length;
        const effectivePresent = present + half * 0.5;
        const absent = Math.max(0, daysInMonth - effectivePresent);
        const perDay = base / daysInMonth;
        const net = Math.round(effectivePresent > 0 ? effectivePresent * perDay : base);
        const b = bankInfoMap.get(u.id);

        return {
          userId: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          team: u.team?.name || "General Floor",
          bank: b?.bank || null,
          ifsc: b?.ifsc || null,
          accountNo: b?.accountNo || null,
          accountType: b?.accountType || null,
          presentDays: present,
          absentDays: absent,
          basicSalary: base,
          augNetSalary: net,
        };
      });
    }

    // Merge adjustments and disbursement status
    const adjustments = await getPayrollAdjustmentsForMonth(targetMonth);

    const mergedItems: AugustLedgerItem[] = rawItems.map((item) => {
      const adj = adjustments[item.userId] || adjustments[item.username] || {};
      const bonus = Number(adj.bonus || 0);
      const deductions = Number(adj.deductions || 0);
      const finalPayout = Math.max(0, item.augNetSalary + bonus - deductions);
      const status = adj.status || (targetMonth === "2026-08" ? "DISBURSED" : "PENDING");
      const disbursedAt = adj.disbursedAt || (status === "DISBURSED" ? (targetMonth === "2026-08" ? "2026-09-01" : new Date().toISOString().split("T")[0]) : null);
      const paymentMethod = adj.paymentMethod || (item.bank ? "IMPS" : "CASH");
      const utrRef = adj.utrRef || (status === "DISBURSED" && targetMonth === "2026-08" ? `GEN-AUG-${item.username.toUpperCase()}` : (adj.utrRef || null));

      return {
        ...item,
        bonus,
        bonusRemarks: adj.bonusRemarks || null,
        deductions,
        deductionRemarks: adj.deductionRemarks || null,
        finalPayout,
        status,
        disbursedAt,
        paymentMethod,
        utrRef,
      };
    });

    let items = mergedItems;
    if (filterUserId && filterUserId !== "ALL") {
      items = items.filter(
        (i) => i.userId === filterUserId || i.username.toLowerCase() === filterUserId.toLowerCase()
      );
    }

    const totals = {
      staffCount: items.length,
      totalPresent: items.reduce((sum, i) => sum + i.presentDays, 0),
      totalAbsent: items.reduce((sum, i) => sum + i.absentDays, 0),
      grossBasePayroll: items.reduce((sum, i) => sum + i.basicSalary, 0),
      totalNetPayout: items.reduce((sum, i) => sum + (i.finalPayout ?? i.augNetSalary), 0),
      totalBonus: items.reduce((sum, i) => sum + (i.bonus || 0), 0),
      totalDeductions: items.reduce((sum, i) => sum + (i.deductions || 0), 0),
      totalDisbursed: items.filter((i) => i.status === "DISBURSED").length,
    };

    return {
      selectedMonth: targetMonth,
      selectedUserId: filterUserId,
      items,
      allStaff,
      availableMonths,
      totals,
    };
  } catch {
    return {
      selectedMonth: targetMonth,
      selectedUserId: filterUserId,
      items: [],
      allStaff: [],
      availableMonths,
      totals: {
        staffCount: 0,
        totalPresent: 0,
        totalAbsent: 0,
        grossBasePayroll: 0,
        totalNetPayout: 0,
        totalBonus: 0,
        totalDeductions: 0,
        totalDisbursed: 0,
      },
    };
  }
}

// Single Employee Personal Salary Record
export async function getMySalaryRecordAction(month?: string): Promise<{
  item: AugustLedgerItem | null;
  availableMonths: Array<{ value: string; label: string }>;
}> {
  const currentMonthKey = getCurrentMonthKey();
  const targetMonth = month && month !== "ALL" ? month : currentMonthKey;
  const session = await getSession();
  const availableMonths = getDefaultAvailableMonths();

  if (!session) return { item: null, availableMonths };

  try {
    const res = await getMonthlySalaryLedgerAction(targetMonth, session.userId);
    const item = res.items[0] || null;
    return { item, availableMonths: res.availableMonths || availableMonths };
  } catch {
    return { item: null, availableMonths };
  }
}

// Update Bonus, Deductions, and Payout Status for an Employee
export async function updatePayrollAdjustmentAction(
  userId: string,
  month: string,
  data: {
    bonus?: number;
    bonusRemarks?: string | null;
    deductions?: number;
    deductionRemarks?: string | null;
    status?: "PENDING" | "PROCESSING" | "DISBURSED";
    paymentMethod?: string | null;
    utrRef?: string | null;
    disbursedAt?: string | null;
  }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    const adjustments = await getPayrollAdjustmentsForMonth(month);
    const existing = adjustments[userId] || {};

    const updatedStatus = data.status ?? existing.status ?? "PENDING";
    const today = new Date().toISOString().split("T")[0];

    adjustments[userId] = {
      ...existing,
      ...(data.bonus !== undefined ? { bonus: Number(data.bonus) } : {}),
      ...(data.bonusRemarks !== undefined ? { bonusRemarks: data.bonusRemarks } : {}),
      ...(data.deductions !== undefined ? { deductions: Number(data.deductions) } : {}),
      ...(data.deductionRemarks !== undefined ? { deductionRemarks: data.deductionRemarks } : {}),
      ...(data.status !== undefined ? { status: updatedStatus } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
      ...(data.utrRef !== undefined ? { utrRef: data.utrRef } : {}),
      disbursedAt:
        updatedStatus === "DISBURSED"
          ? data.disbursedAt || existing.disbursedAt || today
          : null,
    };

    await savePayrollAdjustmentsForMonth(month, adjustments);

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: "Payroll adjustment saved successfully." };
  } catch (err: any) {
    return { error: err.message || "Failed to save payroll adjustment." };
  }
}

// Bulk update disbursement status (e.g. Mark all as Disbursed)
export async function bulkUpdateDisbursementStatusAction(
  month: string,
  status: "PENDING" | "PROCESSING" | "DISBURSED",
  paymentMethod = "IMPS"
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    const adjustments = await getPayrollAdjustmentsForMonth(month);
    const ledgerRes = await getMonthlySalaryLedgerAction(month, "ALL");
    const today = new Date().toISOString().split("T")[0];

    for (const item of ledgerRes.items) {
      const existing = adjustments[item.userId] || {};
      adjustments[item.userId] = {
        ...existing,
        status,
        paymentMethod: existing.paymentMethod || paymentMethod,
        disbursedAt: status === "DISBURSED" ? today : null,
        utrRef:
          status === "DISBURSED"
            ? existing.utrRef || `GEN-${month.replace("-", "")}-${item.username.toUpperCase()}`
            : existing.utrRef,
      };
    }

    await savePayrollAdjustmentsForMonth(month, adjustments);

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `All ${ledgerRes.items.length} employees updated to ${status}.` };
  } catch (err: any) {
    return { error: err.message || "Failed to update bulk disbursement status." };
  }
}



