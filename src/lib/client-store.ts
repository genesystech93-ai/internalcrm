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

// In-memory clients registry
const inMemoryClients: Map<string, StoredClient> = new Map();

function initializeSeedClients() {
  if (inMemoryClients.size > 0) return;

  const now = new Date().toISOString();

  inMemoryClients.set("client-apex-health", {
    id: "client-apex-health",
    name: "Apex Healthcare Buyers LLC",
    contactPerson: "David Miller (Director of Acquisitions)",
    email: "dmiller@apexhealthcare.com",
    defaultNetTerms: "NET_14",
    isActive: true,
    totalLeadsCount: 18,
    pendingApprovalsCount: 5,
    createdAt: now,
    updatedAt: now,
  });

  inMemoryClients.set("client-medicare-direct", {
    id: "client-medicare-direct",
    name: "MediCare Direct Group",
    contactPerson: "Elena Rostova (Compliance & Intake)",
    email: "elena@medicaredirect.com",
    defaultNetTerms: "NET_7",
    isActive: true,
    totalLeadsCount: 24,
    pendingApprovalsCount: 3,
    createdAt: now,
    updatedAt: now,
  });

  inMemoryClients.set("client-careplus-network", {
    id: "client-careplus-network",
    name: "CarePlus Global Network",
    contactPerson: "Marcus Vance (VP of Operations)",
    email: "marcus.vance@careplusglobal.com",
    defaultNetTerms: "NET_21",
    isActive: true,
    totalLeadsCount: 12,
    pendingApprovalsCount: 4,
    createdAt: now,
    updatedAt: now,
  });

  inMemoryClients.set("client-horizon-prime", {
    id: "client-horizon-prime",
    name: "Horizon Prime Insurance LLC",
    contactPerson: "Rachel Adams (Underwriting)",
    email: "radams@horizonprime.com",
    defaultNetTerms: "NET_30",
    isActive: true,
    totalLeadsCount: 31,
    pendingApprovalsCount: 8,
    createdAt: now,
    updatedAt: now,
  });
}

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
  initializeSeedClients();
  return Array.from(inMemoryClients.values()).filter((c) => c.isActive);
}

export function getInMemoryClientById(id: string): StoredClient | undefined {
  initializeSeedClients();
  return inMemoryClients.get(id);
}

export function saveInMemoryClient(client: Omit<StoredClient, "id" | "createdAt" | "updatedAt">): StoredClient {
  initializeSeedClients();
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
