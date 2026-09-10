"use server";
// Genesoft Infotech CRM - Lead Pipeline Management Engine

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { LeadSource, LeadStatus } from "@prisma/client";
import { sanitizeText, sanitizeLongText, validateEmail, validateMobile } from "@/lib/sanitize";
import {
  NetTermsType,
  computeApprovalSLA,
  calculateApprovalDeadline,
  getInMemoryClientById,
} from "@/lib/client-store";

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
  referredByName?: string | null;
  referredByLeadId?: string | null;
  closerName: string;
  status: LeadStatus;
  callBackTime: string | null;
  rejectionReason: string | null;
  agentId: string;
  agentName: string;
  agentUsername: string;
  notes: string | null;
  caseDetails?: string | null;
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
  customStatusLabel?: string | null;
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
  const referredByNameRaw = sanitizeText(formData.get("referredByName"), 150);
  const referredByLeadId = sanitizeText(formData.get("referredByLeadId"), 100) || null;
  const referredByName = referredByNameRaw || null;
  const closerNameRaw = sanitizeText(formData.get("closerName"), 100);
  const closerName = closerNameRaw || "Direct";
  const clientId = sanitizeText(formData.get("clientId"), 64) || null;
  const clientNetTermsRaw = formData.get("clientNetTerms")?.toString();
  const clientNetTerms = (clientNetTermsRaw as NetTermsType) || "NET_14";
  const status = (formData.get("status")?.toString() || "UPLOADED") as LeadStatus;
  const callBackTimeStr = formData.get("callBackTime")?.toString();
  const notes = sanitizeText(formData.get("notes"), 1000);
  const caseDetails = sanitizeLongText(formData.get("caseDetails"));
  const rawCustomStatus = formData.get("customStatusName")?.toString()?.trim();
  const customStatusName = rawCustomStatus ? sanitizeText(rawCustomStatus, 100) : "";

  // Validation: Required fields (closerName defaults to Direct if empty)
  if (!customerName || !dobStr || !rawMobile || !address || !rawEmail || !campaignId) {
    return { error: "Please fill all required fields (Name, DOB, Mobile, Address, Email, Campaign)." };
  }

  // Name length guard
  if (customerName.length < 2) {
    return { error: "Customer Name must be at least 2 characters long." };
  }

  // Reference Source Validation: Must specify referring lead/customer name
  if (source === "REFERENCE" && !referredByName) {
    return { error: "Referring Customer Name is required when Lead Source is set to 'Reference'." };
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
  const expectedApprovalDate = clientId ? calculateApprovalDeadline(new Date(), clientNetTerms) : null;

  let finalNotes = notes || null;
  if (source === "REFERENCE" && referredByName) {
    finalNotes = finalNotes ? `[Referred by: ${referredByName}]\n${finalNotes}` : `[Referred by: ${referredByName}]`;
  }

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

    const rejectionReasonVal = status === "CUSTOM"
      ? (customStatusName ? `CUSTOM:${customStatusName}` : "Custom Status")
      : null;

    const leadData: any = {
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
      rejectionReason: rejectionReasonVal,
      agentId: session.userId,
      notes: finalNotes,
      caseDetails: caseDetails || null,
      clientId: clientId || null,
      clientNetTerms: clientId ? clientNetTerms : null,
      clientSubmittedAt: clientId ? new Date() : null,
      expectedApprovalDate: clientId ? expectedApprovalDate : null,
      clientApprovalStatus: clientId ? "PENDING" : null,
    };

    if (referredByName) {
      leadData.referredByName = referredByName;
    }
    if (referredByLeadId) {
      leadData.referredByLeadId = referredByLeadId;
    }

    const created = await prisma.lead.create({
      data: leadData,
      include: { campaign: true },
    });

    if (status === "CUSTOM" && customStatusName) {
      try {
        await prisma.customStatus.upsert({
          where: { name: customStatusName },
          update: {},
          create: { name: customStatusName, colorHex: "#EC4899", category: "ACTIVE" },
        });
      } catch {}
    }

    // Record initial status history
    await prisma.leadStatusHistory.create({
      data: {
        leadId: created.id,
        previousStatus: status,
        newStatus: status === "CUSTOM" && customStatusName ? `CUSTOM (${customStatusName})` : status,
        changedById: session.userId,
        reason: clientId
          ? `Directly submitted to corporate buyer on ${clientNetTerms.replace("_", " ")} terms upon entry.`
          : status === "CUSTOM" && customStatusName
          ? `Custom status: ${customStatusName}`
          : "Initial lead submission.",
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
    const rejectionReasonVal = status === "CUSTOM"
      ? (customStatusName ? `CUSTOM:${customStatusName}` : "Custom Status")
      : null;

    let clientName: string | null = null;
    let expectedApprovalDateStr: string | null = null;
    let slaLabel: string | null = null;
    let daysRemaining: number | null = null;

    if (clientId) {
      const memClient = getInMemoryClientById(clientId);
      clientName = memClient ? memClient.name : "Corporate Buyer";
      const exp = calculateApprovalDeadline(new Date(), clientNetTerms);
      expectedApprovalDateStr = exp.toISOString();
      const sla = computeApprovalSLA(exp);
      slaLabel = sla.statusLabel;
      daysRemaining = sla.daysRemaining;
    }

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
      referredByName,
      referredByLeadId,
      closerName,
      status,
      callBackTime: callBackTimeStr || null,
      rejectionReason: rejectionReasonVal,
      customStatusLabel: status === "CUSTOM" ? (customStatusName || "Custom Status") : null,
      agentId: session.userId,
      agentName: session.name,
      agentUsername: session.username,
      notes: finalNotes,
      caseDetails: caseDetails || null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      clientId: clientId || null,
      clientName,
      clientNetTerms: clientId ? clientNetTerms : null,
      clientSubmittedAt: clientId ? new Date().toISOString() : null,
      expectedApprovalDate: expectedApprovalDateStr,
      clientApprovalStatus: clientId ? "PENDING" : null,
      daysRemaining,
      isOverdue: false,
      slaLabel,
      history: [
        {
          id: `hist-${Date.now()}`,
          fromStatus: status,
          toStatus: status,
          changedByName: session.name,
          reason: clientId
            ? `Directly submitted to ${clientName} on ${clientNetTerms.replace("_", " ")} terms upon entry.`
            : status === "CUSTOM" && customStatusName
            ? `Custom: ${customStatusName}`
            : "Initial lead submission (Dev Mode).",
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

// 2. Update Lead Case Details (No Character Limit)
export async function updateLeadCaseAction(leadId: string, caseDetails: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized. Please log in." };

  const sanitized = sanitizeLongText(caseDetails);

  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { caseDetails: sanitized || null },
    });

    await prisma.leadStatusHistory.create({
      data: {
        leadId,
        changedById: session.userId,
        previousStatus: "UPLOADED",
        newStatus: "UPLOADED",
        reason: "Updated case details.",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: "Case details updated successfully." };
  } catch {
    const devLeads = await getDevLeads();
    const devL = devLeads.find((l) => l.id === leadId);
    if (devL) {
      devL.caseDetails = sanitized || null;
      devL.history.push({
        id: `hist-${Date.now()}`,
        fromStatus: devL.status,
        toStatus: devL.status,
        changedByName: session.name,
        reason: "Updated case details.",
        createdAt: new Date().toISOString(),
      });
      revalidatePath("/dashboard");
      revalidatePath("/admin");
      return { success: true, message: "Case details updated successfully (Dev Mode)." };
    }
    return { error: "Lead not found." };
  }
}

// Candidate for referring customer picker
export interface ReferrerCandidate {
  id: string;
  customerName: string;
  mobile: string;
  campaignName: string;
}

// Fetch candidate referring leads from existing submitted leads
export async function getReferrerCandidatesAction(query?: string): Promise<ReferrerCandidate[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const whereClause: any = {};
    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { customerName: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        mobile: true,
        campaign: { select: { name: true } },
      },
    });

    if (leads.length > 0) {
      return leads.map((l: any) => ({
        id: l.id,
        customerName: l.customerName,
        mobile: l.mobile,
        campaignName: l.campaign?.name || "General Campaign",
      }));
    }
  } catch {
    // Fallback to dev leads
  }

  const dev = await getDevLeads();
  let list = dev;
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    list = dev.filter((l) => l.customerName.toLowerCase().includes(q) || l.mobile.includes(q));
  }
  return list.slice(0, 30).map((l) => ({
    id: l.id,
    customerName: l.customerName,
    mobile: l.mobile,
    campaignName: l.campaignName || "General Campaign",
  }));
}

// Internal mapper from DB Lead to LeadItem
function mapDbLeadToLeadItem(l: any): LeadItem {
  let daysRemaining: number | null = null;
  let isOverdue: boolean = false;
  let slaLabel: string | null = null;

  if (l.expectedApprovalDate) {
    const sla = computeApprovalSLA(l.expectedApprovalDate);
    daysRemaining = sla.daysRemaining;
    isOverdue = sla.isOverdue;
    slaLabel = sla.statusLabel;
  }

  let customStatusLabel: string | null = null;
  if (l.status === "CUSTOM") {
    if (l.rejectionReason?.startsWith("CUSTOM:")) {
      customStatusLabel = l.rejectionReason.replace("CUSTOM:", "").trim();
    } else if (l.rejectionReason) {
      customStatusLabel = l.rejectionReason.trim();
    } else {
      customStatusLabel = "Custom Status";
    }
  }

  // Parse referredByName if stored in notes fallback
  let referredByName: string | null = l.referredByName || null;
  if (!referredByName && l.notes && l.notes.includes("[Referred by: ")) {
    const m = l.notes.match(/\[Referred by:\s*([^\]]+)\]/);
    if (m) referredByName = m[1].trim();
  }

  return {
    id: l.id,
    customerName: l.customerName,
    dob: l.dob ? (typeof l.dob === "string" ? l.dob : l.dob.toISOString().split("T")[0]) : "1990-01-01",
    mobile: l.mobile,
    address: l.address,
    email: l.email,
    campaignId: l.campaignId,
    campaignName: l.campaign?.name || "General Campaign",
    source: l.source,
    referredByName,
    referredByLeadId: l.referredByLeadId || null,
    closerName: l.closerName,
    status: l.status,
    callBackTime: l.callBackTime ? (typeof l.callBackTime === "string" ? l.callBackTime : l.callBackTime.toISOString()) : null,
    rejectionReason: l.rejectionReason,
    customStatusLabel,
    agentId: l.agentId,
    agentName: l.agent?.name || "Agent",
    agentUsername: l.agent?.username || "agent",
    notes: l.notes,
    caseDetails: l.caseDetails || l.notes || null,
    approvedAt: l.approvedAt ? (typeof l.approvedAt === "string" ? l.approvedAt : l.approvedAt.toISOString()) : null,
    createdAt: l.createdAt ? (typeof l.createdAt === "string" ? l.createdAt : l.createdAt.toISOString()) : new Date().toISOString(),
    clientId: l.clientId,
    clientName: l.client ? l.client.name : null,
    clientNetTerms: l.clientNetTerms,
    clientSubmittedAt: l.clientSubmittedAt ? (typeof l.clientSubmittedAt === "string" ? l.clientSubmittedAt : l.clientSubmittedAt.toISOString()) : null,
    expectedApprovalDate: l.expectedApprovalDate ? (typeof l.expectedApprovalDate === "string" ? l.expectedApprovalDate : l.expectedApprovalDate.toISOString()) : null,
    daysRemaining,
    isOverdue,
    slaLabel,
    clientApprovalStatus: l.clientApprovalStatus,
    clientDecisionReason: l.clientDecisionReason,
    history: Array.isArray(l.statusHistory)
      ? l.statusHistory.map((h: any) => ({
          id: h.id,
          fromStatus: h.previousStatus as LeadStatus,
          toStatus: h.newStatus as LeadStatus,
          changedByName: h.changedBy ? h.changedBy.name : "System",
          reason: h.reason,
          createdAt: h.createdAt ? (typeof h.createdAt === "string" ? h.createdAt : h.createdAt.toISOString()) : new Date().toISOString(),
        }))
      : [],
  };
}

// 2. Get Leads Action (Admin sees all; Agent sees assigned)
export async function getLeadsAction(params?: { campaignId?: string; status?: string; search?: string }): Promise<LeadItem[]> {
  const session = await getSession();
  if (!session) return [];

  const isAdmin = session.role === "ADMIN";

  try {
    const conditions: Record<string, unknown>[] = [];

    if (!isAdmin) {
      conditions.push({
        OR: [
          { agentId: session.userId },
          { closerName: { contains: session.name, mode: "insensitive" } },
          { closerName: { contains: session.username, mode: "insensitive" } },
        ],
      });
    }

    if (params?.campaignId) {
      conditions.push({ campaignId: params.campaignId });
    }

    if (params?.status) {
      conditions.push({ status: params.status as LeadStatus });
    }

    if (params?.search) {
      conditions.push({
        OR: [
          { customerName: { contains: params.search, mode: "insensitive" } },
          { mobile: { contains: params.search } },
          { email: { contains: params.search, mode: "insensitive" } },
          { closerName: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }

    const whereClause = conditions.length > 0 ? { AND: conditions } : {};

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

    return leads.map((l: any) => mapDbLeadToLeadItem(l));
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
    if (l.status === "CUSTOM" && !l.customStatusLabel) {
      if (l.rejectionReason?.startsWith("CUSTOM:")) {
        l.customStatusLabel = l.rejectionReason.replace("CUSTOM:", "").trim();
      } else {
        l.customStatusLabel = l.rejectionReason || "Custom Status";
      }
    }
  }
  let result = isAdmin
    ? [...devLeads]
    : devLeads.filter(
        (l) =>
          l.agentId === session.userId ||
          l.agentUsername === session.username ||
          (l.closerName &&
            (l.closerName.toLowerCase().includes(session.username.toLowerCase()) ||
              l.closerName.toLowerCase().includes(session.name.toLowerCase())))
      );
  if (params?.campaignId) {
    result = result.filter((l) => l.campaignId === params.campaignId);
  }
  if (params?.status) {
    result = result.filter((l) => l.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.customerName.toLowerCase().includes(q) ||
        l.mobile.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.closerName.toLowerCase().includes(q)
    );
  }
  return result;
}

// 2b. Get Single Lead By ID Action (used for Chat Shared Leads & Direct Inspection)
export async function getLeadByIdAction(leadId: string): Promise<LeadItem | null> {
  const session = await getSession();
  if (!session) return null;

  try {
    const l = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        agent: true,
        campaign: true,
        client: true,
        statusHistory: {
          include: { changedBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (l) {
      return mapDbLeadToLeadItem(l);
    }
  } catch (err) {
    console.error("Failed to query lead by ID from database:", err);
  }

  // Fallback: in-memory dev leads
  try {
    const devL = devLeads.find((dl) => dl.id === leadId);
    if (devL) return devL;
  } catch {
    // dev fallback
  }

  return null;
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
  mandatoryReason: string,
  customStatusName?: string
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  const sanitizedMandatoryReason = sanitizeText(mandatoryReason, 500);
  if (!sanitizedMandatoryReason) {
    return { error: "Mandatory justification is required when reclassifying a lead status." };
  }

  const cleanCustomName = customStatusName ? sanitizeText(customStatusName, 100) : "";

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead not found." };
    const oldStatus = lead.status;

    let rejectionReasonVal: string | null = null;
    if (newStatus === "REJECTED") {
      rejectionReasonVal = sanitizedMandatoryReason;
    } else if (newStatus === "CUSTOM") {
      rejectionReasonVal = cleanCustomName ? `CUSTOM:${cleanCustomName}` : `CUSTOM:${sanitizedMandatoryReason}`;
    }

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        rejectionReason: rejectionReasonVal,
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

    // If CUSTOM, ensure it's saved to CustomStatus table
    if (newStatus === "CUSTOM" && cleanCustomName) {
      try {
        await prisma.customStatus.upsert({
          where: { name: cleanCustomName },
          update: {},
          create: { name: cleanCustomName, colorHex: "#EC4899", category: "ACTIVE" },
        });
      } catch {}
    }

    // Log status history
    await prisma.leadStatusHistory.create({
      data: {
        leadId,
        previousStatus: oldStatus,
        newStatus: newStatus === "CUSTOM" && cleanCustomName ? `CUSTOM (${cleanCustomName})` : newStatus,
        changedById: session.userId,
        reason: sanitizedMandatoryReason,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Status updated to ${newStatus === "CUSTOM" && cleanCustomName ? cleanCustomName : newStatus}. Audit reason logged.` };
  } catch {
    // Offline Dev Fallback
    const target = devLeads.find((l) => l.id === leadId);
    if (target) {
      const old = target.status;
      target.status = newStatus;
      target.rejectionReason = newStatus === "CUSTOM" ? (cleanCustomName ? `CUSTOM:${cleanCustomName}` : "Custom Status") : (newStatus === "REJECTED" ? sanitizedMandatoryReason : null);
      target.customStatusLabel = newStatus === "CUSTOM" ? (cleanCustomName || "Custom Status") : null;
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

// 4b. Universal Update Lead Status Action (Used by both Agents and Admins to set standard or Custom status)
export async function updateLeadStatusWithCustomAction(
  leadId: string,
  newStatus: LeadStatus,
  customStatusName?: string,
  reason?: string
) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized. Please log in." };

  if (newStatus === "APPROVED" && session.role !== "ADMIN") {
    return { error: "Permission Denied: Only Admins can approve leads." };
  }
  if (newStatus === "REJECTED" && session.role !== "ADMIN") {
    return { error: "Permission Denied: Only Admins can reject leads." };
  }

  const cleanCustomName = customStatusName ? sanitizeText(customStatusName, 100) : "";
  const auditReason = reason ? sanitizeText(reason, 500) : (newStatus === "CUSTOM" && cleanCustomName ? `Custom status: ${cleanCustomName}` : `Moved to ${newStatus}`);

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead record not found." };
    const oldStatus = lead.status;

    if (oldStatus === "APPROVED" && session.role !== "ADMIN") {
      return { error: "Only Admins can reclassify Approved leads." };
    }

    let rejectionReasonVal: string | null = null;
    if (newStatus === "REJECTED") {
      rejectionReasonVal = auditReason;
    } else if (newStatus === "CUSTOM") {
      rejectionReasonVal = cleanCustomName ? `CUSTOM:${cleanCustomName}` : "Custom Status";
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: newStatus,
        rejectionReason: rejectionReasonVal,
        approvedAt: newStatus === "APPROVED" ? new Date() : null,
      },
    });

    if (oldStatus === "APPROVED" && newStatus !== "APPROVED") {
      await prisma.incentiveEarning.updateMany({
        where: { leadId },
        data: {
          status: "VOIDED",
          reversalReason: `Reversed due to status update to ${newStatus}: ${auditReason}`,
        },
      });
    }

    if (newStatus === "CUSTOM" && cleanCustomName) {
      try {
        await prisma.customStatus.upsert({
          where: { name: cleanCustomName },
          update: {},
          create: { name: cleanCustomName, colorHex: "#EC4899", category: "ACTIVE" },
        });
      } catch {}
    }

    await prisma.leadStatusHistory.create({
      data: {
        leadId,
        previousStatus: oldStatus,
        newStatus: newStatus === "CUSTOM" && cleanCustomName ? `CUSTOM (${cleanCustomName})` : newStatus,
        changedById: session.userId,
        reason: auditReason,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Lead updated to ${newStatus === "CUSTOM" && cleanCustomName ? cleanCustomName : newStatus}.` };
  } catch {
    // Offline Dev Fallback
    const target = devLeads.find((l) => l.id === leadId);
    if (target) {
      const old = target.status;
      target.status = newStatus;
      target.rejectionReason = newStatus === "CUSTOM" ? (cleanCustomName ? `CUSTOM:${cleanCustomName}` : "Custom Status") : (newStatus === "REJECTED" ? auditReason : null);
      target.customStatusLabel = newStatus === "CUSTOM" ? (cleanCustomName || "Custom Status") : null;
      target.history.unshift({
        id: `hist-${Date.now()}`,
        fromStatus: old,
        toStatus: newStatus,
        changedByName: session.name || "User",
        reason: auditReason,
        createdAt: new Date().toISOString(),
      });
    }
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Lead updated to ${newStatus === "CUSTOM" && cleanCustomName ? cleanCustomName : newStatus} (Dev Mode).` };
  }
}

// 5. Custom Status Builder Actions (Available to both Admin and Agents)
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

export async function createCustomStatusAction(name: string, colorHex = "#EC4899") {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized. Please log in." };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: "Custom status name cannot be empty." };
  }

  try {
    await prisma.customStatus.upsert({
      where: { name: cleanName },
      update: { colorHex },
      create: { name: cleanName, colorHex, category: "ACTIVE" },
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Status "${cleanName}" created.` };
  } catch {
    devCustomStatuses.push({
      id: `cs-${Date.now()}`,
      name: cleanName,
      colorHex,
      category: "ACTIVE",
    });
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, message: `Status "${cleanName}" created.` };
}

export async function updateLeadCloserAction(leadId: string, newCloserName: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized. Please log in." };

  const sanitizedCloser = sanitizeText(newCloserName, 100);
  if (!sanitizedCloser) return { error: "Closer name cannot be blank." };

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { error: "Lead not found." };

    await prisma.lead.update({
      where: { id: leadId },
      data: { closerName: sanitizedCloser },
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: `Closer updated to "${sanitizedCloser}".` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to update closer." };
  }
}

// 7. Delete Lead Action (Admin Only - Permanently Deletes Lead and Cleans Up Relations)
export async function deleteLeadAction(leadId: string): Promise<{ success?: boolean; error?: string; message?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Admin authority required." };
  }

  if (!leadId) {
    return { error: "Lead ID is required for deletion." };
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, customerName: true, mobile: true },
    });

    if (!lead) {
      return { error: "Lead not found or already deleted." };
    }

    // Safely unlink chat mentions and purge associated earnings/history
    await (prisma as any).chatMessage.updateMany({
      where: { leadId },
      data: { leadId: null },
    });
    await prisma.incentiveEarning.deleteMany({
      where: { leadId },
    });
    await prisma.leadStatusHistory.deleteMany({
      where: { leadId },
    });

    // Delete lead record
    await prisma.lead.delete({
      where: { id: leadId },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Lead "${lead.customerName}" (${lead.mobile}) permanently deleted from system.`,
    };
  } catch (err: unknown) {
    // Offline Dev Fallback
    const idx = devLeads.findIndex((l) => l.id === leadId);
    if (idx !== -1) {
      const removed = devLeads.splice(idx, 1)[0];
      revalidatePath("/admin");
      revalidatePath("/dashboard");
      return {
        success: true,
        message: `Lead "${removed.customerName}" permanently deleted (Dev Mode).`,
      };
    }
    return { error: err instanceof Error ? err.message : "Failed to delete lead from database." };
  }
}

// 12. Server Action: Save Closer Case Verification Intake Answers
export async function updateCloserIntakeAction(params: {
  leadId: string;
  intakeAnswers: Record<string, string>;
  isCompleted?: boolean;
}): Promise<{ success?: boolean; error?: string; message?: string }> {
  const session = await getSession();
  if (!session) return { error: "Authentication required." };

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
    });

    if (!lead) return { error: "Lead not found." };

    const rawNotes = lead.notes || "";
    let generalNotes = "";
    if (rawNotes.includes("=== GENERAL NOTES ===")) {
      generalNotes = rawNotes.split("=== GENERAL NOTES ===")[1]?.trim() || "";
    } else if (!rawNotes.includes("=== CLOSER INTAKE CASE FACTS ===")) {
      generalNotes = rawNotes.trim();
    }

    const intakeJsonStr = JSON.stringify(params.intakeAnswers, null, 2);
    const updatedNotes = `=== CLOSER INTAKE CASE FACTS ===\n${intakeJsonStr}\n\n=== GENERAL NOTES ===\n${generalNotes}`;

    const newStatus =
      params.isCompleted && (lead.status === "UPLOADED" || lead.status === "CALL_BACK")
        ? "PENDING_VERIFICATION"
        : lead.status;

    await prisma.lead.update({
      where: { id: params.leadId },
      data: {
        notes: updatedNotes,
        status: newStatus,
      },
    });

    // Record status history if changed
    if (newStatus !== lead.status) {
      await prisma.leadStatusHistory.create({
        data: {
          leadId: params.leadId,
          changedById: session.userId,
          previousStatus: lead.status,
          newStatus,
          reason: "Closer completed full case verification questionnaire.",
        },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: params.isCompleted
        ? "Case verification completed and submitted for approval!"
        : "Intake answers saved successfully.",
    };
  } catch (err: any) {
    // Offline Dev Fallback
    const target = devLeads.find((l) => l.id === params.leadId);
    if (target) {
      target.notes = `=== CLOSER INTAKE CASE FACTS ===\n${JSON.stringify(params.intakeAnswers, null, 2)}`;
      if (params.isCompleted && (target.status === "UPLOADED" || target.status === "CALL_BACK")) {
        target.status = "PENDING_VERIFICATION";
      }
    }
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: params.isCompleted
        ? "Case verification completed (Dev Mode)!"
        : "Intake answers saved (Dev Mode).",
    };
  }
}


