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
    const profiles = await prisma.salaryProfile.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });

    if (profiles.length > 0) {
      return profiles.map((p) => ({
        id: p.id,
        userId: p.userId,
        username: p.user.username,
        name: p.user.name,
        role: p.user.role,
        baseSalary: Number(p.baseSalary),
        payFrequency: p.payFrequency,
        effectiveDate: p.effectiveDate.toISOString().split("T")[0],
      }));
    }
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Dynamically generate salary profiles for all real workforce users from user-store
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
      effectiveDate: override ? override.effectiveDate : u.createdAt.split("T")[0],
    };
  });
}

export async function updateSalaryProfileAction(
  userId: string,
  baseSalary: number,
  payFrequency = "MONTHLY"
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.salaryProfile.upsert({
      where: { userId },
      update: { baseSalary, payFrequency, effectiveDate: new Date() },
      create: { userId, baseSalary, payFrequency, effectiveDate: new Date() },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Salary profile updated successfully." };
  } catch {
    // Offline Dev Fallback: Persist in memory so the Admin sees immediate updates
    const today = new Date().toISOString().split("T")[0];
    devSalaryOverrides.set(userId, {
      baseSalary,
      payFrequency,
      effectiveDate: today,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Salary profile updated successfully (Dev Mode)." };
  }
}
