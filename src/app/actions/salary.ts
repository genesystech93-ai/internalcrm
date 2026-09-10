"use server";
// Genesoft Infotech CRM - Employee Salary Management Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { listStoredUsers } from "@/lib/user-store";
import { getCurrentMonthKey, parseMonthDateRange, getDefaultAvailableMonths, formatMonthLabel } from "@/lib/date-utils";

export interface StaffBankingRecord {
  bank?: string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  accountType?: string | null;
  panNo?: string | null;
  upiId?: string | null;
}

export interface SalaryProfileItem {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: string;
  baseSalary: number;
  payFrequency: string;
  effectiveDate: string;
  bank?: string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  accountType?: string | null;
  panNo?: string | null;
  upiId?: string | null;
}

// In-memory salary and banking overrides for offline development
const devSalaryOverrides = new Map<string, { baseSalary: number; payFrequency: string; effectiveDate: string }>();
const devStaffBankingMap = new Map<string, StaffBankingRecord>();

export async function getStaffBankingMap(): Promise<Map<string, StaffBankingRecord>> {
  const result = new Map<string, StaffBankingRecord>();

  // 1. Check august_2026_payroll_ledger for baseline historical accounts
  try {
    const augSet = await prisma.systemSetting.findUnique({ where: { key: "august_2026_payroll_ledger" } });
    if (augSet) {
      const augList: AugustLedgerItem[] = JSON.parse(augSet.value);
      augList.forEach((a) => {
        const item: StaffBankingRecord = {
          bank: a.bank || null,
          ifsc: a.ifsc || null,
          accountNo: a.accountNo || null,
          accountType: a.accountType || "SAVINGS",
        };
        result.set(a.userId, item);
        if (a.username) {
          result.set(a.username.toLowerCase(), item);
        }
      });
    }
  } catch {}

  // 2. Check dedicated staff_banking_profiles (overrides baseline)
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "staff_banking_profiles" } });
    if (setting) {
      const customMap: Record<string, StaffBankingRecord> = JSON.parse(setting.value);
      Object.entries(customMap).forEach(([uid, b]) => {
        result.set(uid, { ...(result.get(uid) || {}), ...b });
      });
    }
  } catch {}

  // 3. Merge in-memory dev overrides
  devStaffBankingMap.forEach((val, key) => {
    result.set(key, { ...(result.get(key) || {}), ...val });
  });

  return result;
}

export async function getSalaryProfilesAction(): Promise<SalaryProfileItem[]> {
  const session = await getSession();
  if (session && session.role !== "ADMIN") return [];

  const bankingMap = await getStaffBankingMap();

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
        const b = bankingMap.get(u.id) || bankingMap.get(u.username.toLowerCase());
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
          bank: b?.bank || null,
          accountNo: b?.accountNo || null,
          ifsc: b?.ifsc || null,
          accountType: b?.accountType || "SAVINGS",
          panNo: b?.panNo || null,
          upiId: b?.upiId || null,
        };
      });
    }

    return [];
  } catch {
    // Database offline fallback: Dynamically generate salary profiles for all real workforce users from user-store
    const staff = listStoredUsers().filter((u) => u.role !== "ADMIN");
    return staff.map((u) => {
      const override = devSalaryOverrides.get(u.id) || devSalaryOverrides.get(u.username);
      const b = bankingMap.get(u.id) || bankingMap.get(u.username.toLowerCase());
      return {
        id: `sal-${u.id}`,
        userId: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        baseSalary: override ? override.baseSalary : 25000.0,
        payFrequency: override ? override.payFrequency : "MONTHLY",
        effectiveDate: override ? override.effectiveDate : (u.createdAt ? u.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
        bank: b?.bank || null,
        accountNo: b?.accountNo || null,
        ifsc: b?.ifsc || null,
        accountType: b?.accountType || "SAVINGS",
        panNo: b?.panNo || null,
        upiId: b?.upiId || null,
      };
    });
  }
}

export async function updateStaffSalaryAndBankingAction(
  userId: string,
  data: {
    baseSalary: number;
    payFrequency?: string;
    effectiveDateStr?: string;
    bank?: string | null;
    accountNo?: string | null;
    ifsc?: string | null;
    accountType?: string | null;
    panNo?: string | null;
    upiId?: string | null;
  }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const effectiveDate = data.effectiveDateStr ? new Date(data.effectiveDateStr) : new Date();

  try {
    // 1. Update salary profile in Prisma
    await prisma.salaryProfile.upsert({
      where: { userId },
      update: {
        baseSalary: data.baseSalary,
        payFrequency: data.payFrequency || "MONTHLY",
        effectiveDate,
      },
      create: {
        userId,
        baseSalary: data.baseSalary,
        payFrequency: data.payFrequency || "MONTHLY",
        effectiveDate,
      },
    });

    // 2. Persist banking details in SystemSetting
    let customMap: Record<string, StaffBankingRecord> = {};
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "staff_banking_profiles" } });
      if (setting) {
        customMap = JSON.parse(setting.value);
      }
    } catch {}

    const bankingRecord: StaffBankingRecord = {
      bank: data.bank ? data.bank.trim() : null,
      accountNo: data.accountNo ? data.accountNo.trim() : null,
      ifsc: data.ifsc ? data.ifsc.trim().toUpperCase() : null,
      accountType: data.accountType || "SAVINGS",
      panNo: data.panNo ? data.panNo.trim().toUpperCase() : null,
      upiId: data.upiId ? data.upiId.trim() : null,
    };

    customMap[userId] = bankingRecord;
    devStaffBankingMap.set(userId, bankingRecord);

    await prisma.systemSetting.upsert({
      where: { key: "staff_banking_profiles" },
      update: { value: JSON.stringify(customMap) },
      create: { key: "staff_banking_profiles", value: JSON.stringify(customMap) },
    });

    // 3. Also update august_2026_payroll_ledger if user exists in it
    try {
      const augSet = await prisma.systemSetting.findUnique({ where: { key: "august_2026_payroll_ledger" } });
      if (augSet) {
        let augList: AugustLedgerItem[] = JSON.parse(augSet.value);
        augList = augList.map((item) => {
          if (item.userId === userId || item.username.toLowerCase() === userId.toLowerCase()) {
            return {
              ...item,
              basicSalary: data.baseSalary,
              bank: bankingRecord.bank || item.bank,
              accountNo: bankingRecord.accountNo || item.accountNo,
              ifsc: bankingRecord.ifsc || item.ifsc,
              accountType: bankingRecord.accountType || item.accountType,
            };
          }
          return item;
        });
        await prisma.systemSetting.update({
          where: { key: "august_2026_payroll_ledger" },
          data: { value: JSON.stringify(augList) },
        });
      }
    } catch {}

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    revalidatePath("/dashboard");
    return { success: true, message: "Staff salary & banking details saved successfully." };
  } catch (err: any) {
    // Dev fallback
    devSalaryOverrides.set(userId, {
      baseSalary: data.baseSalary,
      payFrequency: data.payFrequency || "MONTHLY",
      effectiveDate: data.effectiveDateStr || new Date().toISOString().split("T")[0],
    });
    devStaffBankingMap.set(userId, {
      bank: data.bank || null,
      accountNo: data.accountNo || null,
      ifsc: data.ifsc || null,
      accountType: data.accountType || "SAVINGS",
      panNo: data.panNo || null,
      upiId: data.upiId || null,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Staff salary & banking details saved successfully (Dev Mode)." };
  }
}

export async function updateSalaryProfileAction(
  userId: string,
  baseSalary: number,
  payFrequency = "MONTHLY",
  effectiveDateStr?: string
) {
  return updateStaffSalaryAndBankingAction(userId, {
    baseSalary,
    payFrequency,
    effectiveDateStr,
  });
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
      const bankInfoMap = await getStaffBankingMap();

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



