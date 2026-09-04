"use server";
// Genesoft Infotech CRM - Lead Pipeline Management Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { LeadSource, LeadStatus } from "@prisma/client";
import { sanitizeText, validateEmail, validateMobile } from "@/lib/sanitize";
import { NetTermsType, computeApprovalSLA } from "@/lib/client-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export interface LeadItem {
  id: string;
  customerName: string;
  dob: string;
  mobile: string;
  address: string;
  email: string;
  campaignId: string;
  campaignName: string;
  source: LeadSource;
  closerName: string;
  status: LeadStatus;
  callBackTime: string | null;
  rejectionReason: string | null;
  agentId: string;
  agentName: string;
  agentUsername: string;
  notes: string | null;
  approvedAt: string | null;
  createdAt: string;
  clientId?: string | null;
  clientName?: string | null;
  clientNetTerms?: NetTermsType | null;
  clientSubmittedAt?: string | null;
  expectedApprovalDate?: string | null;
  daysRemaining?: number | null;
  isOverdue?: boolean;
  slaLabel?: string | null;
  clientApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
  clientDecisionReason?: string | null;
  history: Array<{
    id: string;
    fromStatus: LeadStatus;
    toStatus: LeadStatus;
    changedByName: string;
    reason: string | null;
    createdAt: string;
  }>;
}

export interface CustomStatusItem {
  id: string;
  name: string;
  colorHex: string;
  category: string;
}

// In-memory dynamic leads store for offline development (starts clean)
const devLeads: LeadItem[] = [];
const devCustomStatuses: CustomStatusItem[] = [];

export async function getDevLeads(): Promise<LeadItem[]> {
  return devLeads;
}

// 1. Create Lead Action (All 11 fields, Fast Intake & Campaign Mobile Duplicate Block)
export async function createLeadAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized. Please log in." };

  const customerName = sanitizeText(formData.get("customerName"), 100);
  const dobStr = formData.get("dob")?.toString();
  const rawMobile = formData.get("mobile");
  const address = sanitizeText(formData.get("address"), 300);
  const rawEmail = formData.get("email");
  const campaignId = sanitizeText(formData.get("campaignId"), 64);
  const source = (formData.get("source")?.toString() || "DIALER") as LeadSource;
  const closerName = sanitizeText(formData.get("closerName"), 100);
  const status = (formData.get("status")?.toString() || "UPLOADED") as LeadStatus;
  const callBackTimeStr = formData.get("callBackTime")?.toString();
  const notes = sanitizeText(formData.get("notes"), 1000);

  // Validation: Required fields
  if (!customerName || !dobStr || !rawMobile || !address || !rawEmail || !campaignId || !closerName) {
    return { error: "Please fill all required fields (Name, DOB, Mobile, Address, Email, Campaign, Closer)." };
  }

  // Name length guard
  if (customerName.length < 2) {
    return { error: "Customer Name must be at least 2 characters long." };
  }

  // Strict Mobile Validation (10-15 digits only, blocks any text or SQL injection syntax)
  const mobileVal = validateMobile(rawMobile);
  if (!mobileVal.valid) {
    return { error: mobileVal.error || "Mobile number must contain between 10 and 15 numeric digits." };
  }
  const mobile = mobileVal.value;

  // Strict Email Validation
  const emailVal = validateEmail(rawEmail);
  if (!emailVal.valid) {
    return { error: emailVal.error || "Please enter a valid email address." };
  }
  const email = emailVal.value;

  // Address length guard
  if (address.length < 5) {
    return { error: "Street address must be at least 5 characters long." };
  }

  // Restrict Agents from self-approving or rejecting
  if (session.role !== "ADMIN" && (status === "APPROVED" || status === "REJECTED")) {
    return { error: "Permission Denied: Agents cannot directly mark leads as Approved or Rejected." };
  }

  // Callback Time enforcement: Required ONLY if status is CALL_BACK
  if (status === "CALL_BACK" && !callBackTimeStr) {
    return { error: "Call Back Time is strictly mandatory when status is set to 'Call Back'." };
  }

  const dob = new Date(dobStr);
  const callBackTime = callBackTimeStr ? new Date(callBackTimeStr) : null;

  try {
    // Campaign-Scoped Mobile Duplicate Check
    const duplicate = await prisma.lead.findFirst({
      where: {
        mobile,
        campaignId,
      },
      include: { agent: true, campaign: true },
    });

    if (duplicate) {
      return {
        error: `Duplicate Lead Blocked: Mobile "${mobile}" is already registered in campaign "${duplicate.campaign.name}" by Agent @${duplicate.agent.username} on ${new Date(duplicate.createdAt).toLocaleDateString()}. Cross-campaign intake is allowed under a different campaign.`,
      };
    }

    const created = await prisma.lead.create({
      data: {
        customerName,
        dob,
        mobile,
        address,
        email,
        campaignId,
        source,
        closerName,
        status,
        callBackTime,
        agentId: session.userId,
        notes: notes || null,
      },
      include: { campaign: true },
    });

    // Record initial status history
    await prisma.leadStatusHistory.create({
      data: {
        leadId: created.id,
        previousStatus: status,
        newStatus: status,
        changedById: session.userId,
        reason: "Initial lead submission.",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: `Lead "${customerName}" submitted successfully.` };
  } catch {
    // Offline Dev Fallback with Duplicate Checking
    const duplicateDev = devLeads.find((l) => l.mobile === mobile && l.campaignId === campaignId);
    if (duplicateDev) {
      return {
        error: `Duplicate Lead Blocked: Mobile "${mobile}" already exists in "${duplicateDev.campaignName}" (Entered by @${duplicateDev.agentUsername}). Cross-campaign intake is allowed under a different campaign.`,
      };
    }

    const campaignName = campaignId || "General Floor";
    const newLead: LeadItem = {
      id: `dev-lead-${Date.now()}`,
      customerName,
      dob: dobStr,
      mobile,
      address,
      email,
      campaignId,
      campaignName,
      source,
      closerName,
      status,
      callBackTime: callBackTimeStr || null,
      rejectionReason: null,
      agentId: session.userId,
      agentName: session.name,
      agentUsername: session.username,
      notes: notes || null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      history: [
        {
          id: `hist-${Date.now()}`,
          fromStatus: status,
          toStatus: status,
          changedByName: session.name,
          reason: "Initial lead submission (Dev Mode).",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    devLeads.unshift(newLead);
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: `Lead "${customerName}" submitted successfully (Dev Mode).` };
  }
}

// 2. Get Leads Action (Admin sees all; Agent sees assigned)
export async function getLeadsAction(params?: { campaignId?: string; status?: string; search?: string }): Promise<LeadItem[]> {
  const session = await getSession();
  if (!session) return [];

  const isAdmin = session.role === "ADMIN";

  try {
    const whereClause: Record<string, unknown> = {};
    if (!isAdmin) {
      whereClause.agentId = session.userId;
    }
    if (params?.campaignId) {
      whereClause.campaignId = params.campaignId;
    }
    if (params?.status) {
      whereClause.status = params.status as LeadStatus;
    }
    if (params?.search) {
      whereClause.OR = [
        { customerName: { contains: params.search, mode: "insensitive" } },
        { mobile: { contains: params.search } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const leads = await db.lead.findMany({
      where: whereClause,
      include: {
        agent: true,
        campaign: true,
        client: true,
        statusHistory: {
          include: { changedBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return leads.map((l: any) => {
      let daysRemaining: number | null = null;
      let isOverdue: boolean = false;
      let slaLabel: string | null = null;

      if (l.expectedApprovalDate) {
        const sla = computeApprovalSLA(l.expectedApprovalDate);
        daysRemaining = sla.daysRemaining;
        isOverdue = sla.isOverdue;
        slaLabel = sla.statusLabel;
      }

      return {
        id: l.id,
        customerName: l.customerName,
        dob: l.dob.toISOString().split("T")[0],
        mobile: l.mobile,
        address: l.address,
        email: l.email,
        campaignId: l.campaignId,
        campaignName: l.campaign.name,
        source: l.source,
        closerName: l.closerName,
        status: l.status,
        callBackTime: l.callBackTime ? l.callBackTime.toISOString() : null,
        rejectionReason: l.rejectionReason,
        agentId: l.agentId,
        agentName: l.agent.name,
        agentUsername: l.agent.username,
        notes: l.notes,
        approvedAt: l.approvedAt ? l.approvedAt.toISOString() : null,
        createdAt: l.createdAt.toISOString(),
        clientId: l.clientId,
        clientName: l.client ? l.client.name : null,
        clientNetTerms: l.clientNetTerms,
        clientSubmittedAt: l.clientSubmittedAt ? l.clientSubmittedAt.toISOString() : null,
        expectedApprovalDate: l.expectedApprovalDate ? l.expectedApprovalDate.toISOString() : null,
        daysRemaining,
        isOverdue,
        slaLabel,
        clientApprovalStatus: l.clientApprovalStatus,
        clientDecisionReason: l.clientDecisionReason,
        history: l.statusHistory.map((h: any) => ({
          id: h.id,
          fromStatus: h.previousStatus as LeadStatus,
          toStatus: h.newStatus as LeadStatus,
          changedByName: h.changedBy.name,
          reason: h.reason,
          createdAt: h.createdAt.toISOString(),
        })),
      };
    });
  } catch {
    // Database offline fallback
  }

  // Filter in-memory dev leads
  for (const l of devLeads) {
    if (l.expectedApprovalDate) {
      const sla = computeApprovalSLA(l.expectedApprovalDate);
      l.daysRemaining = sla.daysRemaining;
      l.isOverdue = sla.isOverdue;
      l.slaLabel = sla.statusLabel;
    }
  }
  let result = isAdmin ? [...devLeads] : devLeads.filter((l) => l.agentId === session.userId || l.agentUsername === session.username);
  if (params?.campaignId) {
    result = result.filter((l) => l.campaignId === params.campaignId);
  }
  if (params?.status) {
    result = result.filter((l) => l.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (l) => l.customerName.toLowerCase().includes(q) || l.mobile.includes(q) || l.email.toLowerCase().includes(q)
    );
  }
  return result;
}

// 3. Admin Decision Action (Approve / Reject with auto-incentive crediting)
export async function adminDecisionAction(
  leadId: string,
  decision: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const sanitizedRejectionReason = rejectionReason ? sanitizeText(rejectionReason, 500) : "";
  if (decision === "REJECTED" && !sanitizedRejectionReason) {
    return { error: "A mandatory rejection reason is required when rejecting a lead." };
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    });

    if (!lead) return { error: "Lead record not found." };
    const oldStatus = lead.status;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: decision as LeadStatus,
        rejectionReason: decision === "REJECTED" ? sanitizedRejectionReason : null,
        approvedAt: decision === "APPROVED" ? new Date() : null,
      },
    });

    // Record audit status change
    await prisma.leadStatusHistory.create({
      data: {
        leadId,
        previousStatus: oldStatus,
        newStatus: decision as LeadStatus,
        changedById: session.userId,
        reason: decision === "REJECTED" ? sanitizedRejectionReason : "Approved by Admin quality verification.",
      },
    });

    // If APPROVED, auto-credit incentives to Agent AND Closer based on active IncentiveRules
    if (decision === "APPROVED") {
      // 1. Fetch active incentive rules for this campaign (or general floor)
      const rules = await prisma.incentiveRule.findMany({
        where: {
          isActive: true,
          OR: [
            { campaignId: lead.campaignId },
            { campaignId: null },
          ],
        },
      });

      const agentRule = rules.find((r) => r.roleTarget === "AGENT" && (r.campaignId === lead.campaignId || !r.campaignId));
      const closerRule = rules.find((r) => r.roleTarget === "CLOSER" && (r.campaignId === lead.campaignId || !r.campaignId));

      const agentCommission = agentRule ? Number(agentRule.amountPerLead) : Number(lead.campaign?.commissionPerLead || 15.0);

      // A. Credit Intake Agent
      if (lead.agentId) {
        await prisma.incentiveEarning.create({
          data: {
            leadId,
            userId: lead.agentId,
            ruleId: agentRule?.id || null,
            amount: agentCommission,
            status: "ACCRUED",
          },
        });
      }

      // B. Credit Closer with separate closer incentive rate
      if (lead.closerName && lead.closerName.trim()) {
        const closerNameTrim = lead.closerName.trim();
        let closerUserId: string | null = null;

        if (/self/i.test(closerNameTrim)) {
          closerUserId = lead.agentId;
        } else {
          // Check if format has @username (e.g. "Akash M (@akashm)")
          const usernameMatch = closerNameTrim.match(/@([a-zA-Z0-9_.-]+)/);
          const extractedUsername = usernameMatch ? usernameMatch[1] : null;

          const closerUser = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: [
                ...(extractedUsername ? [{ username: { equals: extractedUsername, mode: "insensitive" as const } }] : []),
                { name: { equals: closerNameTrim, mode: "insensitive" } },
                { username: { equals: closerNameTrim, mode: "insensitive" } },
                { id: closerNameTrim },
              ],
            },
          });
          if (closerUser) {
            closerUserId = closerUser.id;
          }
        }

        if (closerUserId) {
          const closerCommission = closerRule
            ? Number(closerRule.amountPerLead)
            : Number(lead.campaign?.commissionPerLead || 15.0);

          await prisma.incentiveEarning.create({
            data: {
              leadId,
              userId: closerUserId,
              ruleId: closerRule?.id || null,
              amount: closerCommission,
              status: "ACCRUED",
            },
          });
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Lead marked as ${decision}.` };
  } catch {
    // Offline Dev Fallback
    const target = devLeads.find((l) => l.id === leadId);
    if (target) {
      const oldStatus = target.status;
      target.status = decision as LeadStatus;
      target.rejectionReason = decision === "REJECTED" ? sanitizedRejectionReason : null;
      target.approvedAt = decision === "APPROVED" ? new Date().toISOString() : null;
      target.history.unshift({
        id: `hist-${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: decision as LeadStatus,
        changedByName: session.name || "Administrator",
        reason: decision === "REJECTED" ? sanitizedRejectionReason : "Approved by Admin (Dev Mode).",
        createdAt: new Date().toISOString(),
      });
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Lead marked as ${decision} (Dev Mode).` };
  }
}

// 4. Admin Reclassify Lead Action (Changes status of any lead; strictly enforces reason and auto-reverses incentives if changing Approved lead)
export async function adminReclassifyLeadAction(
  leadId: string,
  newStatus: LeadStatus,
  mandatoryReason: string
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const sanitizedMandatoryReason = sanitizeText(mandatoryReason, 500);
  if (!sanitizedMandatoryReason) {
    return { error: "Mandatory justification is required when reclassifying a lead status." };
  }

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead not found." };
    const oldStatus = lead.status;

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        rejectionReason: newStatus === "REJECTED" ? sanitizedMandatoryReason : null,
        approvedAt: newStatus === "APPROVED" ? new Date() : null,
      },
    });

    // If previously APPROVED and moving away, reverse any credited incentive
    if (oldStatus === "APPROVED" && newStatus !== "APPROVED") {
      await prisma.incentiveEarning.updateMany({
        where: { leadId },
        data: {
          status: "VOIDED",
          reversalReason: `Reversed due to reclassification to ${newStatus}: ${sanitizedMandatoryReason}`,
        },
      });
    }

    // Log status history
    await prisma.leadStatusHistory.create({
      data: {
        leadId,
        previousStatus: oldStatus,
        newStatus: newStatus,
        changedById: session.userId,
        reason: sanitizedMandatoryReason,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Status updated to ${newStatus}. Audit reason logged.` };
  } catch {
    // Offline Dev Fallback
    const target = devLeads.find((l) => l.id === leadId);
    if (target) {
      const old = target.status;
      target.status = newStatus;
      target.history.unshift({
        id: `hist-${Date.now()}`,
        fromStatus: old,
        toStatus: newStatus,
        changedByName: session.name || "Administrator",
        reason: sanitizedMandatoryReason,
        createdAt: new Date().toISOString(),
      });
    }
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Lead reclassified to ${newStatus} (Dev Mode).` };
  }
}

// 5. Custom Status Builder Actions
export async function getCustomStatusesAction(): Promise<CustomStatusItem[]> {
  try {
    const list = await prisma.customStatus.findMany({ orderBy: { name: "asc" } });
    if (list.length > 0) {
      return list.map((c) => ({
        id: c.id,
        name: c.name,
        colorHex: c.colorHex,
        category: c.category,
      }));
    }
  } catch {
    // Fallback
  }
  return devCustomStatuses;
}

export async function createCustomStatusAction(name: string, colorHex = "#F97316") {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  try {
    await prisma.customStatus.create({
      data: { name: name.trim(), colorHex, category: "ACTIVE" },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Status "${name}" created.` };
  } catch {
    devCustomStatuses.push({
      id: `cs-${Date.now()}`,
      name: name.trim(),
      colorHex,
      category: "ACTIVE",
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Status "${name}" created (Dev Mode).` };
  }
}
