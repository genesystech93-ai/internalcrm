"use server";
// Genesoft Infotech CRM - Calling Campaigns & Shift Schedules Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getDevLeads } from "@/app/actions/leads";
import { listStoredUsers } from "@/lib/user-store";

export interface CampaignItem {
  id: string;
  name: string;
  vertical: string | null;
  shiftStartTime: string;
  shiftEndTime: string;
  lateGraceMinutes: number;
  commissionPerLead: number;
  isActive: boolean;
  totalLeads: number;
  approvedLeads: number;
}

export interface AnalyticsData {
  totalLeads: number;
  approvedCount: number;
  rejectedCount: number;
  callbackCount: number;
  uploadedCount: number;
  pendingCount: number;
  voicemailCount: number;
  totalCommissionPaid: number;
  conversionRate: number;
  sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
  leaderboard: Array<{ agentName: string; username: string; approvedLeads: number; totalEarnings: number }>;
}

const configuredCampaigns: CampaignItem[] = [];

export async function getCampaignsAction(): Promise<CampaignItem[]> {
  try {
    const list = await prisma.campaign.findMany({
      include: {
        leads: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return list.map((c) => ({
      id: c.id,
      name: c.name,
      vertical: c.vertical,
      shiftStartTime: c.shiftStartTime,
      shiftEndTime: c.shiftEndTime,
      lateGraceMinutes: c.lateGraceMinutes,
      commissionPerLead: Number(c.commissionPerLead),
      isActive: c.isActive,
      totalLeads: c.leads.length,
      approvedLeads: c.leads.filter((l) => l.status === "APPROVED").length,
    }));
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Return configured campaigns with dynamic lead counts
  const devLeads = await getDevLeads();
  return configuredCampaigns.map((c) => ({
    ...c,
    totalLeads: devLeads.filter((l) => l.campaignId === c.id || l.campaignName === c.name).length,
    approvedLeads: devLeads.filter((l) => (l.campaignId === c.id || l.campaignName === c.name) && l.status === "APPROVED").length,
  }));
}

export async function createCampaignAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const name = formData.get("name")?.toString().trim();
  const vertical = formData.get("vertical")?.toString().trim();
  const shiftStartTime = formData.get("shiftStartTime")?.toString().trim() || "19:00";
  const shiftEndTime = formData.get("shiftEndTime")?.toString().trim() || "04:00";
  const lateGraceMinutes = parseInt(formData.get("lateGraceMinutes")?.toString() || "15", 10);
  const commissionPerLead = parseFloat(formData.get("commissionPerLead")?.toString() || "15.0");

  if (!name) return { error: "Campaign name is required." };

  try {
    await prisma.campaign.create({
      data: {
        name,
        vertical: vertical || null,
        shiftStartTime,
        shiftEndTime,
        lateGraceMinutes,
        commissionPerLead,
        isActive: true,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: `Campaign "${name}" created successfully.` };
  } catch {
    // Dev fallback
    configuredCampaigns.push({
      id: `camp-${Date.now()}`,
      name,
      vertical: vertical || "General",
      shiftStartTime,
      shiftEndTime,
      lateGraceMinutes,
      commissionPerLead,
      isActive: true,
      totalLeads: 0,
      approvedLeads: 0,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: `Campaign "${name}" created successfully (Dev Mode).` };
  }
}

export async function updateCampaignAction(
  campaignId: string,
  data: {
    name: string;
    vertical?: string | null;
    shiftStartTime: string;
    shiftEndTime: string;
    lateGraceMinutes: number;
    commissionPerLead: number;
    isActive: boolean;
  }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const name = data.name.trim();
  if (!name) return { error: "Campaign name is required." };

  try {
    // Check if another campaign already has this name
    const existing = await prisma.campaign.findFirst({
      where: {
        name,
        id: { not: campaignId },
      },
    });
    if (existing) {
      return { error: `Another campaign with the name "${name}" already exists.` };
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        vertical: data.vertical?.trim() || null,
        shiftStartTime: data.shiftStartTime || "19:00",
        shiftEndTime: data.shiftEndTime || "04:00",
        lateGraceMinutes: Number(data.lateGraceMinutes) || 15,
        commissionPerLead: Number(data.commissionPerLead) || 15,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: `Campaign "${name}" updated successfully.` };
  } catch (err: unknown) {
    console.error("Error updating campaign in DB:", err);
    // Dev fallback
    const target = configuredCampaigns.find((c) => c.id === campaignId);
    if (target) {
      target.name = name;
      target.vertical = data.vertical || null;
      target.shiftStartTime = data.shiftStartTime;
      target.shiftEndTime = data.shiftEndTime;
      target.lateGraceMinutes = Number(data.lateGraceMinutes);
      target.commissionPerLead = Number(data.commissionPerLead);
      target.isActive = data.isActive;
    }
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: `Campaign "${name}" updated successfully.` };
  }
}

export async function deleteCampaignAction(campaignId: string, force: boolean = false) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!campaign) {
      return { error: "Campaign not found." };
    }

    const leadCount = campaign._count.leads;

    // Safety prompt if campaign contains leads and force flag is false
    if (leadCount > 0 && !force) {
      return {
        error: `Campaign "${campaign.name}" contains ${leadCount} lead(s). Deletion requires confirmation to delete associated lead records.`,
        hasLeads: true,
        leadCount,
      };
    }

    // Clean up dependent records in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Unlink attendance records so attendance history isn't broken
      await tx.attendance.updateMany({
        where: { campaignId },
        data: { campaignId: null },
      });

      // 2. Remove incentive rules for this campaign
      await tx.incentiveRule.deleteMany({
        where: { campaignId },
      });

      // 3. If leads exist, cascade delete lead-dependent records
      if (leadCount > 0) {
        const leadIds = (
          await tx.lead.findMany({
            where: { campaignId },
            select: { id: true },
          })
        ).map((l) => l.id);

        if (leadIds.length > 0) {
          await tx.chatMessage.updateMany({
            where: { leadId: { in: leadIds } },
            data: { leadId: null },
          });
          await tx.lead.deleteMany({
            where: { campaignId },
          });
        }
      }

      // 4. Delete the campaign itself
      await tx.campaign.delete({
        where: { id: campaignId },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: `Campaign "${campaign.name}" deleted successfully.` };
  } catch (err: unknown) {
    console.error("Error deleting campaign:", err);
    // Dev fallback
    const idx = configuredCampaigns.findIndex((c) => c.id === campaignId);
    if (idx !== -1) {
      const removed = configuredCampaigns.splice(idx, 1)[0];
      revalidatePath("/admin");
      revalidatePath("/admin/settings");
      revalidatePath("/dashboard");
      return { success: true, message: `Campaign "${removed.name}" deleted.` };
    }
    return { error: err instanceof Error ? err.message : "Failed to delete campaign." };
  }
}

export async function toggleCampaignStatusAction(campaignId: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { isActive },
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Campaign "${updated.name}" is now ${isActive ? "Active" : "Archived"}.`,
    };
  } catch {
    const target = configuredCampaigns.find((c) => c.id === campaignId);
    if (target) target.isActive = isActive;
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Campaign status updated to ${isActive ? "Active" : "Archived"}.`,
    };
  }
}

export async function updateCampaignShiftAction(
  campaignId: string,
  shiftStartTime: string,
  shiftEndTime: string,
  lateGraceMinutes: number,
  commissionPerLead: number
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        shiftStartTime,
        shiftEndTime,
        lateGraceMinutes,
        commissionPerLead,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: "Campaign shift schedule updated." };
  } catch {
    // Dev fallback
    const target = configuredCampaigns.find((c) => c.id === campaignId);
    if (target) {
      target.shiftStartTime = shiftStartTime;
      target.shiftEndTime = shiftEndTime;
      target.lateGraceMinutes = lateGraceMinutes;
      target.commissionPerLead = commissionPerLead;
    }
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    return { success: true, message: "Shift schedule saved (Dev Mode)." };
  }
}

export async function getOperationalAnalyticsAction(): Promise<AnalyticsData> {
  try {
    const [leads, earnings, agents] = await Promise.all([
      prisma.lead.findMany({ select: { status: true, source: true } }),
      prisma.incentiveEarning.findMany({ select: { amount: true, status: true } }),
      prisma.user.findMany({
        where: { role: "AGENT" },
        include: {
          leads: { where: { status: "APPROVED" } },
          incentiveEarnings: { where: { status: "ACCRUED" } },
        },
      }),
    ]);

    const total = leads.length;
    const approved = leads.filter((l) => l.status === "APPROVED").length;
    const rejected = leads.filter((l) => l.status === "REJECTED").length;
    const callbacks = leads.filter((l) => l.status === "CALL_BACK").length;
    const uploaded = leads.filter((l) => l.status === "UPLOADED").length;
    const pending = leads.filter((l) => l.status === "PENDING_VERIFICATION").length;
    const voicemail = leads.filter((l) => l.status === "VOICEMAIL").length;

    const totalPaid = earnings
      .filter((e) => e.status === "ACCRUED" || e.status === "PAID")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Source breakdown
    const sources = ["DIALER", "MANUAL_DIAL", "REFERENCE", "CUSTOM"];
    const sourceBreakdown = sources.map((s) => {
      const count = leads.filter((l) => l.source === s).length;
      return {
        source: s,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    // Leaderboard
    const leaderboard = agents.map((a) => ({
      agentName: a.name,
      username: a.username,
      approvedLeads: a.leads.length,
      totalEarnings: a.incentiveEarnings.reduce((acc, curr) => acc + Number(curr.amount), 0),
    }));

    return {
      totalLeads: total,
      approvedCount: approved,
      rejectedCount: rejected,
      callbackCount: callbacks,
      uploadedCount: uploaded,
      pendingCount: pending,
      voicemailCount: voicemail,
      totalCommissionPaid: totalPaid,
      conversionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      sourceBreakdown,
      leaderboard,
    };
  } catch {
    // Database offline fallback
  }

  // Offline Dev Fallback: Compute analytics from real data in devLeads and user-store
  const devLeads = await getDevLeads();
  const staff = listStoredUsers().filter((u) => u.role === "AGENT");

  const total = devLeads.length;
  const approved = devLeads.filter((l) => l.status === "APPROVED").length;
  const rejected = devLeads.filter((l) => l.status === "REJECTED").length;
  const callbacks = devLeads.filter((l) => l.status === "CALL_BACK").length;
  const uploaded = devLeads.filter((l) => l.status === "UPLOADED").length;
  const pending = devLeads.filter((l) => l.status === "PENDING_VERIFICATION").length;
  const voicemail = devLeads.filter((l) => l.status === "VOICEMAIL").length;

  const totalPaid = approved * 15.0; // Standard approved commission
  const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  const sources = ["DIALER", "MANUAL_DIAL", "REFERENCE", "CUSTOM"];
  const sourceBreakdown = sources.map((s) => {
    const count = devLeads.filter((l) => l.source === s).length;
    return {
      source: s,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const leaderboard = staff.map((a) => {
    const userApproved = devLeads.filter((l) => (l.agentId === a.id || l.agentUsername === a.username) && l.status === "APPROVED").length;
    return {
      agentName: a.name,
      username: a.username,
      approvedLeads: userApproved,
      totalEarnings: userApproved * 15.0,
    };
  });

  return {
    totalLeads: total,
    approvedCount: approved,
    rejectedCount: rejected,
    callbackCount: callbacks,
    uploadedCount: uploaded,
    pendingCount: pending,
    voicemailCount: voicemail,
    totalCommissionPaid: totalPaid,
    conversionRate,
    sourceBreakdown,
    leaderboard,
  };
}
