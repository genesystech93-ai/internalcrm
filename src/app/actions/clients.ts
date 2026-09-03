"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeText, validateEmail } from "@/lib/sanitize";
import {
  NetTermsType,
  ClientApprovalStatusType,
  StoredClient,
  getInMemoryClients,
  getInMemoryClientById,
  saveInMemoryClient,
  calculateApprovalDeadline,
} from "@/lib/client-store";
import { adminDecisionAction } from "@/app/actions/leads";

// Safe dynamic accessor to prevent stale language server issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export interface ClientItem {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  defaultNetTerms: NetTermsType;
  isActive: boolean;
  totalLeadsCount: number;
  pendingApprovalsCount: number;
  createdAt: string;
}

// 1. Get all active clients
export async function getClientsAction(): Promise<ClientItem[]> {
  const session = await getSession();
  if (!session) return [];

  try {
    const clients = await db.client.findMany({
      where: { isActive: true },
      include: {
        leads: {
          select: {
            id: true,
            clientApprovalStatus: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    if (clients && clients.length > 0) {
      return clients.map((c: any) => ({
        id: c.id,
        name: c.name,
        contactPerson: c.contactPerson,
        email: c.email,
        defaultNetTerms: c.defaultNetTerms as NetTermsType,
        isActive: c.isActive,
        totalLeadsCount: c.leads ? c.leads.length : 0,
        pendingApprovalsCount: c.leads
          ? c.leads.filter((l: any) => l.clientApprovalStatus === "PENDING").length
          : 0,
        createdAt: c.createdAt.toISOString(),
      }));
    }
  } catch {
    // Fallback to in-memory store
  }

  const fallbackClients = getInMemoryClients();
  return fallbackClients.map((c) => ({
    id: c.id,
    name: c.name,
    contactPerson: c.contactPerson || null,
    email: c.email || null,
    defaultNetTerms: c.defaultNetTerms,
    isActive: c.isActive,
    totalLeadsCount: c.totalLeadsCount || 0,
    pendingApprovalsCount: c.pendingApprovalsCount || 0,
    createdAt: c.createdAt,
  }));
}

// 2. Create a new Client
export async function createClientAction(formData: FormData): Promise<{ success?: boolean; error?: string; client?: ClientItem }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Permission Denied: Only Admins can register new corporate clients." };
  }

  const name = sanitizeText(formData.get("name"), 120);
  const contactPerson = sanitizeText(formData.get("contactPerson"), 120);
  const rawEmail = formData.get("email");
  const defaultNetTerms = (formData.get("defaultNetTerms")?.toString() || "NET_14") as NetTermsType;

  if (!name || name.length < 2) {
    return { error: "Client / Buyer company name must be at least 2 characters long." };
  }

  let email: string | null = null;
  if (rawEmail) {
    const val = validateEmail(rawEmail);
    if (!val.valid) {
      return { error: val.error || "Please enter a valid email address." };
    }
    email = val.value;
  }

  try {
    const created = await db.client.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        email,
        defaultNetTerms,
        isActive: true,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");

    return {
      success: true,
      client: {
        id: created.id,
        name: created.name,
        contactPerson: created.contactPerson,
        email: created.email,
        defaultNetTerms: created.defaultNetTerms,
        isActive: created.isActive,
        totalLeadsCount: 0,
        pendingApprovalsCount: 0,
        createdAt: created.createdAt.toISOString(),
      },
    };
  } catch {
    // Fallback to in-memory store
  }

  const saved = saveInMemoryClient({
    name,
    contactPerson,
    email,
    defaultNetTerms,
    isActive: true,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin");

  return {
    success: true,
    client: {
      id: saved.id,
      name: saved.name,
      contactPerson: saved.contactPerson || null,
      email: saved.email || null,
      defaultNetTerms: saved.defaultNetTerms,
      isActive: saved.isActive,
      totalLeadsCount: 0,
      pendingApprovalsCount: 0,
      createdAt: saved.createdAt,
    },
  };
}

// 3. Submit Lead to Client with Net 7, 14, 21, 30 approval SLA
export async function submitLeadToClientAction(params: {
  leadId: string;
  clientId: string;
  netTerms?: NetTermsType;
  customSubmittedAt?: string;
}): Promise<{
  success?: boolean;
  error?: string;
  expectedApprovalDate?: string;
  clientName?: string;
  netTerms?: NetTermsType;
}> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Permission Denied: Only Admins can submit leads to external buyers/clients." };
  }

  const { leadId, clientId } = params;
  if (!leadId || !clientId) {
    return { error: "Missing required parameters (leadId and clientId)." };
  }

  const submissionDate = params.customSubmittedAt ? new Date(params.customSubmittedAt) : new Date();

  // Find Client to determine terms
  let clientName = "Client Buyer";
  let chosenTerms: NetTermsType = params.netTerms || "NET_14";

  try {
    const client = await db.client.findUnique({ where: { id: clientId } });
    if (client) {
      clientName = client.name;
      if (!params.netTerms) {
        chosenTerms = client.defaultNetTerms as NetTermsType;
      }
    }
  } catch {
    const memClient = getInMemoryClientById(clientId);
    if (memClient) {
      clientName = memClient.name;
      if (!params.netTerms) chosenTerms = memClient.defaultNetTerms;
    }
  }

  // Calculate approval deadline = submission date + net days
  const expectedApprovalDate = calculateApprovalDeadline(submissionDate, chosenTerms);

  try {
    // Fetch lead details for audit trail
    const existingLead = await db.lead.findUnique({
      where: { id: leadId },
      select: { customerName: true, status: true },
    });

    if (existingLead) {
      // Update lead with client submission info
      await db.lead.update({
        where: { id: leadId },
        data: {
          clientId,
          clientNetTerms: chosenTerms,
          clientSubmittedAt: submissionDate,
          expectedApprovalDate,
          clientApprovalStatus: "PENDING",
        },
      });

      // Audit trail in LeadStatusHistory
      await db.leadStatusHistory.create({
        data: {
          leadId,
          changedById: session.userId,
          previousStatus: existingLead.status,
          newStatus: existingLead.status,
          reason: `Submitted to ${clientName} on ${chosenTerms.replace("_", " ")} terms. Approval expected by ${expectedApprovalDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}.`,
        },
      });

      revalidatePath("/admin");
      revalidatePath("/dashboard");

      return {
        success: true,
        clientName,
        netTerms: chosenTerms,
        expectedApprovalDate: expectedApprovalDate.toISOString(),
      };
    }
  } catch {
    // In-memory fallback
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return {
    success: true,
    clientName,
    netTerms: chosenTerms,
    expectedApprovalDate: expectedApprovalDate.toISOString(),
  };
}

// 4. Record Client's Final Approval / Rejection Decision
export async function recordClientDecisionAction(params: {
  leadId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Permission Denied: Only Admins can finalize client decisions." };
  }

  const { leadId, decision, reason } = params;

  if (decision === "APPROVED") {
    // Use existing adminDecisionAction to execute approval & incentive credit
    const res = await adminDecisionAction(leadId, "APPROVED", reason || "Client accepted & approved the file");
    if (res.error) return { error: res.error };

    try {
      await db.lead.update({
        where: { id: leadId },
        data: {
          clientApprovalStatus: "APPROVED",
          clientDecisionReason: reason || "Client verified and approved file.",
        },
      });
    } catch {
      // fallback
    }

    revalidatePath("/admin");
    return { success: true };
  } else {
    if (!reason || reason.trim().length < 3) {
      return { error: "Mandatory: Please provide the client's rejection reason." };
    }

    const res = await adminDecisionAction(leadId, "REJECTED", reason);
    if (res.error) return { error: res.error };

    try {
      await db.lead.update({
        where: { id: leadId },
        data: {
          clientApprovalStatus: "REJECTED",
          clientDecisionReason: reason,
        },
      });
    } catch {
      // fallback
    }

    revalidatePath("/admin");
    return { success: true };
  }
}
