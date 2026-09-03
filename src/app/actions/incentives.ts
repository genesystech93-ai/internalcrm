"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { RoleTarget } from "@prisma/client";

export interface IncentiveRuleItem {
  id: string;
  campaignId: string;
  campaignName: string;
  role: RoleTarget;
  amountPerLead: number;
  minLeadsTarget: number;
  teamBonusPool: number;
  isActive: boolean;
}

export interface UserEarningsSummary {
  approvedLeadsCount: number;
  individualCommissions: number;
  teamPoolBonus: number;
  totalEarnings: number;
  history: Array<{
    id: string;
    leadCustomerName: string;
    campaignName: string;
    amount: number;
    ruleType: string;
    createdAt: string;
  }>;
}

const emptyEarnings: UserEarningsSummary = {
  approvedLeadsCount: 0,
  individualCommissions: 0,
  teamPoolBonus: 0,
  totalEarnings: 0,
  history: [],
};

export async function getIncentiveRulesAction(): Promise<IncentiveRuleItem[]> {
  try {
    const rules = await prisma.incentiveRule.findMany({
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });

    return rules.map((r) => ({
      id: r.id,
      campaignId: r.campaignId || "",
      campaignName: r.campaign?.name || "General Campaign",
      role: r.roleTarget,
      amountPerLead: Number(r.amountPerLead),
      minLeadsTarget: r.bonusThreshold || 10,
      teamBonusPool: Number(r.bonusAmount || 0),
      isActive: r.isActive,
    }));
  } catch {
    // Database offline — return empty list
    return [];
  }
}

export async function createIncentiveRuleAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const campaignId = formData.get("campaignId")?.toString();
  const role = (formData.get("role")?.toString() || "AGENT") as RoleTarget;
  const amountPerLead = parseFloat(formData.get("amountPerLead")?.toString() || "15.0");
  const minLeadsTarget = parseInt(formData.get("minLeadsTarget")?.toString() || "10", 10);
  const teamBonusPool = parseFloat(formData.get("teamBonusPool")?.toString() || "500.0");

  if (!campaignId) return { error: "Campaign is required." };

  try {
    await prisma.incentiveRule.create({
      data: {
        campaignId,
        roleTarget: role,
        amountPerLead,
        bonusThreshold: minLeadsTarget,
        bonusAmount: teamBonusPool,
        isActive: true,
      },
    });

    revalidatePath("/admin");
    return { success: true, message: "Custom incentive rule created successfully." };
  } catch {
    return { error: "Database is offline. Unable to create incentive rule." };
  }
}

export async function getUserEarningsSummaryAction(): Promise<UserEarningsSummary> {
  const session = await getSession();
  if (!session) return emptyEarnings;

  try {
    const earnings = await prisma.incentiveEarning.findMany({
      where: { userId: session.userId },
      include: {
        lead: { include: { campaign: true } },
        rule: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (earnings.length > 0) {
      const individual = earnings
        .filter((e) => !e.rule || Number(e.rule.amountPerLead) > 0)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const teamPool = earnings
        .filter((e) => e.rule && Number(e.rule.bonusAmount) > 0)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        approvedLeadsCount: earnings.length,
        individualCommissions: individual,
        teamPoolBonus: teamPool,
        totalEarnings: individual + teamPool,
        history: earnings.map((e) => ({
          id: e.id,
          leadCustomerName: e.lead?.customerName || "Approved Lead",
          campaignName: e.lead?.campaign?.name || "General Campaign",
          amount: Number(e.amount),
          ruleType: e.rule ? `RULE_${e.rule.roleTarget}` : "INDIVIDUAL",
          createdAt: e.createdAt.toISOString(),
        })),
      };
    }

    return emptyEarnings;
  } catch {
    // Database offline — return empty earnings
    return emptyEarnings;
  }
}
