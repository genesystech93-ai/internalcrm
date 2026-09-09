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

// ==============================================================================
// CAMPAIGN INTAKE CRITERIA & QUESTIONNAIRE ENGINE
// ==============================================================================

export type QuestionInputType = "text" | "textarea" | "yes_no" | "date" | "number";

export interface CampaignQuestion {
  id: string;
  section: string;
  label: string;
  type: QuestionInputType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

export interface CampaignCriteria {
  campaignId: string;
  templateName: string;
  sections: string[];
  questions: CampaignQuestion[];
}

// 1. MVA (Motor Vehicle Accident) Gold-Standard Pre-Loaded Template (User's Exact Sample)
export const MVA_STANDARD_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-mva",
  templateName: "MVA (Motor Vehicle Accident)",
  sections: [
    "1. Accident & Incident Details",
    "2. Injuries, Symptoms & Vehicle Details",
    "3. Medical Treatment, Hospital & Doctor Information",
    "4. Police Report, Officer, Ambulance & Claim Numbers",
    "5. Legal Affirmation & Qualification Checklist",
  ],
  questions: [
    // Section 1: Accident & Incident Details
    {
      id: "accident_date_time",
      section: "1. Accident & Incident Details",
      label: "Can you confirm the year and month of the accident?",
      type: "text",
      required: true,
      placeholder: "e.g. September 09 2025 (3.20 PM)",
    },
    {
      id: "accident_place",
      section: "1. Accident & Incident Details",
      label: "Place of accident",
      type: "text",
      required: true,
      placeholder: "e.g. 30 W Winnemucca Blvd, Winnemucca, NV 89445",
    },
    {
      id: "at_fault",
      section: "1. Accident & Incident Details",
      label: "Who was AT FAULT for the accident? Did you receive a ticket?",
      type: "text",
      required: true,
      placeholder: "e.g. Other Party / No ticket received",
    },
    {
      id: "at_fault_had_insurance",
      section: "1. Accident & Incident Details",
      label: "Did the AT FAULT driver have Car insurance?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },

    // Section 2: Injuries, Symptoms & Vehicle Details
    {
      id: "were_you_injured",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Were you injured in the car accident?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "still_treating",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Are you still being treated for your injuries?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "symptoms",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Symptoms",
      type: "textarea",
      required: true,
      placeholder: "e.g. intense pain, Heavy swelling, bruising, Body Ache",
    },
    {
      id: "injury_locations",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Where were your injured?",
      type: "text",
      required: true,
      placeholder: "e.g. Left leg, Right Ankle, Left Hand, and elbow fracture",
    },
    {
      id: "vehicle_name",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Vehicle name",
      type: "text",
      required: true,
      placeholder: "e.g. 2005 Mazda 6",
    },
    {
      id: "client_had_insurance",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Did you have insurance at the time of the accident?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "insurance_company",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Insurance company",
      type: "text",
      required: true,
      placeholder: "e.g. Progressive Insurance Company",
    },
    {
      id: "uninsured_motorist_coverage",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Do you know if you have Uninsured Motorist coverage on policy?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },
    {
      id: "attorney_represented",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Have you hired or are you currently represented by an attorney?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },

    // Section 3: Medical Treatment, Hospital & Doctor Information
    {
      id: "tests_done",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Test",
      type: "text",
      required: true,
      placeholder: "e.g. X-rays, CT scans, and MRI scan",
    },
    {
      id: "went_to_hospital",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Did you go to the hospital, doctor, emergency room due to those injuries?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "hospital_name",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital",
      type: "text",
      required: true,
      placeholder: "e.g. Humboldt General Hospital",
    },
    {
      id: "hospital_address",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital address",
      type: "text",
      required: true,
      placeholder: "e.g. 118 E Haskell St, Winnemucca, NV 89445",
    },
    {
      id: "hospital_phone",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital Phone",
      type: "text",
      required: true,
      placeholder: "e.g. (775) 623-5222",
    },
    {
      id: "days_hospitalized",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "How many day's in hospitalized",
      type: "text",
      required: true,
      placeholder: "e.g. 16 day's",
    },
    {
      id: "doctor_name",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Doctor",
      type: "text",
      required: true,
      placeholder: "e.g. Dr. Timothy Musick, MD",
    },
    {
      id: "doctor_designation",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Designation",
      type: "text",
      required: true,
      placeholder: "e.g. Orthopedic Surgeon",
    },
    {
      id: "treatments",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Treatments",
      type: "textarea",
      required: true,
      placeholder: "e.g. plaster, exercise , medications, physiotheraphy",
    },
    {
      id: "treatment_within_14_days",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Did you received treatment for your injuries? (Must be 14 days from the accident)",
      type: "text",
      required: true,
      placeholder: "e.g. September 26 2025 (yes immediately I gone through X RAYS)",
    },
    {
      id: "last_treatment_date",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "When was the last time that you were treated for these injuries?",
      type: "text",
      required: true,
      placeholder: "e.g. Oct 06 2025",
    },

    // Section 4: Police Report, Officer, Ambulance & Claim Numbers
    {
      id: "ambulance_transport",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Did you get transported from the accident scene in an ambulance?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "has_accident_report",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Do you have accident report or incident report Number ?",
      type: "text",
      required: true,
      placeholder: "e.g. Yes I have it",
    },
    {
      id: "police_dept_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Department",
      type: "text",
      required: true,
      placeholder: "e.g. Winnemucca Police Department",
    },
    {
      id: "police_dept_address",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Dept Address",
      type: "text",
      required: true,
      placeholder: "e.g. 500 E Winnemucca Blvd, Winnemucca, NV 89445",
    },
    {
      id: "police_dept_phone",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Dept Phone",
      type: "text",
      required: true,
      placeholder: "e.g. (775) 623-6396",
    },
    {
      id: "officer_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Officer Name",
      type: "text",
      required: true,
      placeholder: "e.g. Officer Sean Wilkin",
    },
    {
      id: "badge_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Badge Number",
      type: "text",
      required: true,
      placeholder: "e.g. #7515",
    },
    {
      id: "ambulance_service_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Ambulance Services Provided Name",
      type: "text",
      required: true,
      placeholder: "e.g. HGH EMS Rescue",
    },
    {
      id: "complaint_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Complaint Number",
      type: "text",
      required: true,
      placeholder: "e.g. ODN-45-56942",
    },
    {
      id: "insurance_claim_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Insurance Claim Number",
      type: "text",
      required: true,
      placeholder: "e.g. CIO-78-986451",
    },

    // Section 5: Legal Affirmation & Qualification Checklist (Questions 1 to 7)
    {
      id: "legal_q1_attorney",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "1) Do you have an attorney or lawyer for this case?",
      type: "text",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q2_signed_docs",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "2) Did you sign any legal documents before my call regarding this claim ?",
      type: "text",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q3_medical_records",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "3) Do you have medical records with you ?",
      type: "text",
      required: true,
      placeholder: "e.g. They are at the hospital.",
    },
    {
      id: "legal_q4_records_permission",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "4) Do you give permission to the law firm to pull out your medical records from the hospital ?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "legal_q5_info_true",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "5) Is the information given by you true and matches with your medical records ?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "legal_q6_coaching",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "6) Is there anyone trying to coach you, train you for getting this compensation ?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q7_how_known",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "7) Then how did you come to know about the lawsuit ?",
      type: "text",
      required: true,
      placeholder: "e.g. I saw ads on Facebook",
    },
  ],
};

// 2. Slip & Fall / Premises Liability Template
export const SLIP_AND_FALL_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-slip-fall",
  templateName: "Slip & Fall (Premises Liability)",
  sections: [
    "1. Incident & Premises Details",
    "2. Hazard & Fall Conditions",
    "3. Medical & Hospital Care",
    "4. Incident Report & Witnesses",
    "5. Legal Affirmation Checklist",
  ],
  questions: [
    { id: "sf_date_time", section: "1. Incident & Premises Details", label: "Date and time of the fall", type: "text", required: true, placeholder: "e.g. August 14 2025 (2:15 PM)" },
    { id: "sf_location", section: "1. Incident & Premises Details", label: "Exact location / Store / Business name & address", type: "text", required: true, placeholder: "e.g. Walmart, 1200 Market St" },
    { id: "sf_hazard", section: "2. Hazard & Fall Conditions", label: "What caused you to fall? (Spill, ice, broken flooring, poor lighting)", type: "textarea", required: true, placeholder: "e.g. Liquid spill in aisle with no warning sign" },
    { id: "sf_warning_signs", section: "2. Hazard & Fall Conditions", label: "Were there any warning signs or cones present?", type: "yes_no", required: true, defaultValue: "No" },
    { id: "sf_injuries", section: "2. Hazard & Fall Conditions", label: "Where were you injured and what are your symptoms?", type: "textarea", required: true, placeholder: "e.g. Lower back pain, fractured wrist" },
    { id: "sf_hospital", section: "3. Medical & Hospital Care", label: "Hospital / Urgent care visited", type: "text", required: true, placeholder: "e.g. Metro Health ER" },
    { id: "sf_doctor", section: "3. Medical & Hospital Care", label: "Treating doctor and treatments received", type: "text", required: true, placeholder: "e.g. Dr. Patel - Cast & physical therapy" },
    { id: "sf_incident_report", section: "4. Incident Report & Witnesses", label: "Was an incident report filed with management on-site?", type: "yes_no", required: true, defaultValue: "Yes" },
    { id: "sf_report_number", section: "4. Incident Report & Witnesses", label: "Incident report number or manager name", type: "text", required: false, placeholder: "e.g. IR-89211" },
    { id: "sf_legal_q1", section: "5. Legal Affirmation Checklist", label: "Do you have an attorney for this claim?", type: "yes_no", required: true, defaultValue: "No" },
    { id: "sf_legal_q2", section: "5. Legal Affirmation Checklist", label: "Do you give permission to obtain incident photos and medical records?", type: "yes_no", required: true, defaultValue: "Yes" },
  ],
};

// 3. Workers' Compensation Template
export const WORKERS_COMP_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-workers-comp",
  templateName: "Workers' Compensation",
  sections: [
    "1. Employment & Notice Details",
    "2. Incident & Workplace Injury",
    "3. Medical Treatment & Restrictions",
    "4. Legal Affirmation Checklist",
  ],
  questions: [
    { id: "wc_employer", section: "1. Employment & Notice Details", label: "Employer company name & location", type: "text", required: true, placeholder: "e.g. Apex Logistics, Reno NV" },
    { id: "wc_job_title", section: "1. Employment & Notice Details", label: "Job title / duties when injured", type: "text", required: true, placeholder: "e.g. Warehouse Forklift Operator" },
    { id: "wc_reported_date", section: "1. Employment & Notice Details", label: "When was injury reported to supervisor?", type: "text", required: true, placeholder: "e.g. Same day / Next morning" },
    { id: "wc_supervisor_name", section: "1. Employment & Notice Details", label: "Supervisor name & title", type: "text", required: true, placeholder: "e.g. Dave Miller, Floor Lead" },
    { id: "wc_incident_desc", section: "2. Incident & Workplace Injury", label: "How did the injury occur?", type: "textarea", required: true, placeholder: "e.g. Heavy crate fell on shoulder" },
    { id: "wc_injuries", section: "2. Incident & Workplace Injury", label: "Injuries sustained", type: "text", required: true, placeholder: "e.g. Torn rotator cuff, cervical strain" },
    { id: "wc_clinic", section: "3. Medical Treatment & Restrictions", label: "Occupational clinic / Doctor visited", type: "text", required: true, placeholder: "e.g. Concentra Urgent Care" },
    { id: "wc_work_status", section: "3. Medical Treatment & Restrictions", label: "Current work status (Off work, light duty, full duty)", type: "text", required: true, placeholder: "e.g. Off work by doctor orders" },
    { id: "wc_legal_q1", section: "4. Legal Affirmation Checklist", label: "Do you already have a workers' comp lawyer?", type: "yes_no", required: true, defaultValue: "No" },
  ],
};

// 4. General Personal Injury Template
export const PERSONAL_INJURY_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-pi",
  templateName: "General Personal Injury",
  sections: [
    "1. Incident Overview",
    "2. Injuries & Ongoing Symptoms",
    "3. Medical Treatment & Facility",
    "4. Legal Affirmation",
  ],
  questions: [
    { id: "pi_date", section: "1. Incident Overview", label: "Date and location of incident", type: "text", required: true, placeholder: "e.g. July 2025, Las Vegas NV" },
    { id: "pi_type", section: "1. Incident Overview", label: "Type of incident (Product defect, dog bite, assault, general)", type: "text", required: true, placeholder: "e.g. Defective equipment" },
    { id: "pi_injuries", section: "2. Injuries & Ongoing Symptoms", label: "Specific bodily injuries & pain levels", type: "textarea", required: true, placeholder: "e.g. Severe burns, nerve damage" },
    { id: "pi_treatment", section: "3. Medical Treatment & Facility", label: "Hospitals, surgeries or therapy received", type: "textarea", required: true, placeholder: "e.g. Valley Hospital, 2 surgeries" },
    { id: "pi_legal_q1", section: "4. Legal Affirmation", label: "Are you represented by an attorney?", type: "yes_no", required: true, defaultValue: "No" },
  ],
};

const devCriteriaStore = new Map<string, CampaignCriteria>();

// Server Action: Get Campaign Criteria
export async function getCampaignCriteriaAction(campaignId: string): Promise<CampaignCriteria> {
  // Check in-memory store first
  if (devCriteriaStore.has(campaignId)) {
    return devCriteriaStore.get(campaignId)!;
  }

  try {
    const settingKey = `campaign_criteria_${campaignId}`;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: settingKey },
    });

    if (setting) {
      const parsed: CampaignCriteria = JSON.parse(setting.value);
      devCriteriaStore.set(campaignId, parsed);
      return parsed;
    }
  } catch {
    // Database offline
  }

  // If campaign name has MVA or Motor, default to MVA template
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (campaign && (campaign.name.toUpperCase().includes("MVA") || campaign.name.toUpperCase().includes("MOTOR"))) {
      const criteria: CampaignCriteria = { ...MVA_STANDARD_TEMPLATE, campaignId };
      return criteria;
    }
  } catch {
    // Ignore
  }

  // Default: Return MVA standard criteria for campaign
  return { ...MVA_STANDARD_TEMPLATE, campaignId };
}

// Server Action: Save Campaign Criteria (Admin Only)
export async function saveCampaignCriteriaAction(
  campaignId: string,
  criteria: CampaignCriteria
): Promise<{ success?: boolean; error?: string; message?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    const settingKey = `campaign_criteria_${campaignId}`;
    const valueStr = JSON.stringify(criteria);

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: valueStr },
      create: { key: settingKey, value: valueStr },
    });

    devCriteriaStore.set(campaignId, criteria);

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");

    return { success: true, message: `Campaign criteria for "${criteria.templateName}" saved successfully.` };
  } catch (err: any) {
    devCriteriaStore.set(campaignId, criteria);
    return { success: true, message: "Campaign criteria saved in memory." };
  }
}

// Server Action: Get Standard Pre-Built Criteria Presets
export async function getStandardTemplatesAction(): Promise<
  Array<{ id: string; name: string; criteria: CampaignCriteria }>
> {
  return [
    { id: "mva", name: "MVA (Motor Vehicle Accident)", criteria: MVA_STANDARD_TEMPLATE },
    { id: "slip_fall", name: "Slip & Fall (Premises Liability)", criteria: SLIP_AND_FALL_TEMPLATE },
    { id: "workers_comp", name: "Workers' Compensation", criteria: WORKERS_COMP_TEMPLATE },
    { id: "personal_injury", name: "General Personal Injury", criteria: PERSONAL_INJURY_TEMPLATE },
    {
      id: "blank",
      name: "Blank / Custom Questionnaire",
      criteria: {
        campaignId: "preset-custom",
        templateName: "Custom Campaign Criteria",
        sections: ["1. General Qualification Questions"],
        questions: [
          {
            id: "custom_q1",
            section: "1. General Qualification Questions",
            label: "Were you injured or suffered damages?",
            type: "yes_no",
            required: true,
            defaultValue: "Yes",
          },
        ],
      },
    },
  ];
}

