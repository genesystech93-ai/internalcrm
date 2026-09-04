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

export interface CampaignIncentiveItem {
  campaignId: string;
  campaignName: string;
  campaignVertical?: string | null;
  agentAmountPerLead: number;
  closerAmountPerLead: number;
  minLeadsTarget: number;
  teamBonusPool: number;
  isActive: boolean;
  agentRuleId?: string;
  closerRuleId?: string;
}

export interface UserEarningsSummary {
  approvedLeadsCount: number;
  individualCommissions: number;
  teamPoolBonus: number;
  totalEarnings: number;
  teamName?: string;
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

export async function getCampaignIncentivesAction(): Promise<CampaignIncentiveItem[]> {
  try {
    const [rules, campaigns] = await Promise.all([
      prisma.incentiveRule.findMany({
        include: { campaign: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.campaign.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const map = new Map<string, CampaignIncentiveItem>();

    for (const r of rules) {
      const cId = r.campaignId || "general";
      const cName = r.campaign?.name || "General Floor";
      const cVert = r.campaign?.vertical || null;

      if (!map.has(cId)) {
        map.set(cId, {
          campaignId: cId,
          campaignName: cName,
          campaignVertical: cVert,
          agentAmountPerLead: 0,
          closerAmountPerLead: 0,
          minLeadsTarget: r.bonusThreshold || 10,
          teamBonusPool: Number(r.bonusAmount || 0),
          isActive: r.isActive,
        });
      }

      const item = map.get(cId)!;
      if (r.roleTarget === "AGENT") {
        item.agentAmountPerLead = Number(r.amountPerLead);
        item.agentRuleId = r.id;
        item.isActive = r.isActive;
        if (r.bonusThreshold) item.minLeadsTarget = r.bonusThreshold;
        if (r.bonusAmount) item.teamBonusPool = Number(r.bonusAmount);
      } else if (r.roleTarget === "CLOSER") {
        item.closerAmountPerLead = Number(r.amountPerLead);
        item.closerRuleId = r.id;
        item.isActive = item.isActive || r.isActive;
        if (r.bonusThreshold && !item.minLeadsTarget) item.minLeadsTarget = r.bonusThreshold;
        if (r.bonusAmount && !item.teamBonusPool) item.teamBonusPool = Number(r.bonusAmount);
      }
    }

    return Array.from(map.values());
  } catch {
    return [];
  }
}

export async function saveCampaignIncentiveAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const campaignId = formData.get("campaignId")?.toString();
  const agentAmount = parseFloat(formData.get("agentAmount")?.toString() || "0");
  const closerAmount = parseFloat(formData.get("closerAmount")?.toString() || "0");
  const minLeadsTarget = parseInt(formData.get("minLeadsTarget")?.toString() || "10", 10);
  const teamBonusPool = parseFloat(formData.get("teamBonusPool")?.toString() || "0");

  if (!campaignId) return { error: "Campaign is required." };
  if (isNaN(agentAmount) || agentAmount < 0) return { error: "Please enter a valid Agent commission amount." };
  if (isNaN(closerAmount) || closerAmount < 0) return { error: "Please enter a valid Closer commission amount." };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Upsert AGENT rule
      const existingAgentRule = await tx.incentiveRule.findFirst({
        where: { campaignId, roleTarget: "AGENT" },
      });

      if (existingAgentRule) {
        await tx.incentiveRule.update({
          where: { id: existingAgentRule.id },
          data: {
            amountPerLead: agentAmount,
            bonusThreshold: minLeadsTarget,
            bonusAmount: teamBonusPool,
            isActive: true,
          },
        });
      } else {
        await tx.incentiveRule.create({
          data: {
            campaignId,
            roleTarget: "AGENT",
            amountPerLead: agentAmount,
            bonusThreshold: minLeadsTarget,
            bonusAmount: teamBonusPool,
            isActive: true,
          },
        });
      }

      // 2. Upsert CLOSER rule
      const existingCloserRule = await tx.incentiveRule.findFirst({
        where: { campaignId, roleTarget: "CLOSER" },
      });

      if (existingCloserRule) {
        await tx.incentiveRule.update({
          where: { id: existingCloserRule.id },
          data: {
            amountPerLead: closerAmount,
            bonusThreshold: minLeadsTarget,
            bonusAmount: teamBonusPool,
            isActive: true,
          },
        });
      } else {
        await tx.incentiveRule.create({
          data: {
            campaignId,
            roleTarget: "CLOSER",
            amountPerLead: closerAmount,
            bonusThreshold: minLeadsTarget,
            bonusAmount: teamBonusPool,
            isActive: true,
          },
        });
      }

      // 3. Keep campaign commissionPerLead aligned
      await tx.campaign.update({
        where: { id: campaignId },
        data: { commissionPerLead: agentAmount },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Campaign incentive rates saved successfully." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to save campaign incentives." };
  }
}

export async function deleteCampaignIncentiveAction(campaignId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const rules = await tx.incentiveRule.findMany({ where: { campaignId } });
      const ruleIds = rules.map((r) => r.id);
      if (ruleIds.length > 0) {
        await tx.incentiveEarning.updateMany({
          where: { ruleId: { in: ruleIds } },
          data: { ruleId: null },
        });
        await tx.incentiveRule.deleteMany({
          where: { id: { in: ruleIds } },
        });
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: "Campaign incentive rules removed." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to delete campaign incentive rules." };
  }
}

export async function toggleCampaignIncentiveAction(campaignId: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.incentiveRule.updateMany({
      where: { campaignId },
      data: { isActive },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: `Campaign incentives ${isActive ? "activated" : "paused"}.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update status." };
  }
}

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
    return [];
  }
}

export async function createIncentiveRuleAction(formData: FormData) {
  return saveCampaignIncentiveAction(formData);
}

export async function deleteIncentiveRuleAction(ruleId: string) {
  return deleteCampaignIncentiveAction(ruleId);
}

export async function toggleIncentiveRuleAction(ruleId: string, isActive: boolean) {
  return toggleCampaignIncentiveAction(ruleId, isActive);
}

export async function getUserEarningsSummaryAction(): Promise<UserEarningsSummary> {
  const session = await getSession();
  if (!session) return emptyEarnings;

  try {
    const [earnings, user] = await Promise.all([
      prisma.incentiveEarning.findMany({
        where: { userId: session.userId },
        include: {
          lead: { include: { campaign: true } },
          rule: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        include: { team: true },
      }),
    ]);

    const teamName = user?.team?.name;

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
        teamName,
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

    return { ...emptyEarnings, teamName };
  } catch {
    // Database offline — return empty earnings
    return emptyEarnings;
  }
}
