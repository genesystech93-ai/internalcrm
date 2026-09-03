export type NetTermsType = "NET_7" | "NET_14" | "NET_21" | "NET_30";
export type ClientApprovalStatusType = "PENDING" | "APPROVED" | "REJECTED";

export interface StoredClient {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  defaultNetTerms: NetTermsType;
  isActive: boolean;
  totalLeadsCount?: number;
  pendingApprovalsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// In-memory clients registry (starts clean)
const inMemoryClients: Map<string, StoredClient> = new Map();

// Convert NetTerms to number of calendar days
export function netTermsToDays(terms: NetTermsType): number {
  switch (terms) {
    case "NET_7":
      return 7;
    case "NET_14":
      return 14;
    case "NET_21":
      return 21;
    case "NET_30":
      return 30;
    default:
      return 14;
  }
}

// Calculate Expected Approval Date = Submission Date + Net Days
export function calculateApprovalDeadline(submissionDate: Date, terms: NetTermsType): Date {
  const days = netTermsToDays(terms);
  const deadline = new Date(submissionDate);
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

// Compute days remaining and overdue state
export function computeApprovalSLA(expectedApprovalDate: Date | string): {
  daysRemaining: number;
  isOverdue: boolean;
  statusLabel: string;
} {
  const deadline = new Date(expectedApprovalDate);
  const today = new Date();
  
  // Set both to start of day for accurate day-difference calculation
  const d1 = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      daysRemaining: Math.abs(diffDays),
      isOverdue: true,
      statusLabel: `⚠️ Overdue ${Math.abs(diffDays)}d`,
    };
  } else if (diffDays === 0) {
    return {
      daysRemaining: 0,
      isOverdue: false,
      statusLabel: `⏳ Due Today`,
    };
  } else if (diffDays <= 2) {
    return {
      daysRemaining: diffDays,
      isOverdue: false,
      statusLabel: `⏳ Due in ${diffDays}d`,
    };
  } else {
    return {
      daysRemaining: diffDays,
      isOverdue: false,
      statusLabel: `${diffDays}d left`,
    };
  }
}

// In-memory client accessors
export function getInMemoryClients(): StoredClient[] {
  return Array.from(inMemoryClients.values()).filter((c) => c.isActive);
}

export function getInMemoryClientById(id: string): StoredClient | undefined {
  return inMemoryClients.get(id);
}

export function saveInMemoryClient(client: Omit<StoredClient, "id" | "createdAt" | "updatedAt">): StoredClient {
  const id = `client-${Date.now()}`;
  const now = new Date().toISOString();
  const newClient: StoredClient = {
    ...client,
    id,
    totalLeadsCount: 0,
    pendingApprovalsCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  inMemoryClients.set(id, newClient);
  return newClient;
}
