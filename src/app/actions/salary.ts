"use server";
// Genesoft Infotech CRM - Employee Salary Management Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { listStoredUsers } from "@/lib/user-store";

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
  if (!session || session.role !== "ADMIN") return [];

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
            ? profile.effectiveDate.toISOString().split("T")[0]
            : override
            ? override.effectiveDate
            : u.createdAt.toISOString().split("T")[0],
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
}

export async function getAugustPayrollLedgerAction(filterUserId?: string): Promise<AugustLedgerItem[]> {
  const session = await getSession();
  if (!session) return [];

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
  };
}

export async function getMonthlySalaryLedgerAction(
  month = "2026-08",
  filterUserId = "ALL"
): Promise<MonthlyPayrollResponse> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return {
      selectedMonth: month,
      selectedUserId: filterUserId,
      items: [],
      allStaff: [],
      availableMonths: [
        { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
        { value: "2026-09", label: "September 2026 (Active Roster)" },
      ],
      totals: { staffCount: 0, totalPresent: 0, totalAbsent: 0, grossBasePayroll: 0, totalNetPayout: 0 },
    };
  }

  const availableMonths = [
    { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
    { value: "2026-09", label: "September 2026 (Active Roster)" },
  ];

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

    if (month === "2026-08") {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "august_2026_payroll_ledger" },
      });
      if (setting) {
        rawItems = JSON.parse(setting.value);
      }
    } else {
      // Projected September 2026 / Active month calculation
      const mStart = new Date("2026-09-01T00:00:00.000Z");
      const mEnd = new Date("2026-09-30T23:59:59.999Z");

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

      // Fetch August ledger to preserve banking info
      let bankInfoMap = new Map<string, { bank: string | null; ifsc: string | null; accountNo: string | null; accountType: string | null }>();
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
        const absent = Math.max(0, 30 - effectivePresent);
        const perDay = base / 30;
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

    let items = rawItems;
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
      totalNetPayout: items.reduce((sum, i) => sum + i.augNetSalary, 0),
    };

    return {
      selectedMonth: month,
      selectedUserId: filterUserId,
      items,
      allStaff,
      availableMonths,
      totals,
    };
  } catch {
    return {
      selectedMonth: month,
      selectedUserId: filterUserId,
      items: [],
      allStaff: [],
      availableMonths,
      totals: { staffCount: 0, totalPresent: 0, totalAbsent: 0, grossBasePayroll: 0, totalNetPayout: 0 },
    };
  }
}

// Single Employee Personal Salary Record
export async function getMySalaryRecordAction(month = "2026-08"): Promise<{
  item: AugustLedgerItem | null;
  availableMonths: Array<{ value: string; label: string }>;
}> {
  const session = await getSession();
  const availableMonths = [
    { value: "2026-08", label: "August 2026 (Aug.xlsx Imported)" },
    { value: "2026-09", label: "September 2026 (Active)" },
  ];

  if (!session) return { item: null, availableMonths };

  try {
    const res = await getMonthlySalaryLedgerAction(month, session.userId);
    const item = res.items[0] || null;
    return { item, availableMonths };
  } catch {
    return { item: null, availableMonths };
  }
}


