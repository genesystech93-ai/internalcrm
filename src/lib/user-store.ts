import { Role } from "@prisma/client";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  email: string | null;
  isActive: boolean;
  campaignName?: string | null;
  createdAt: string;
}

// Single shared in-memory registry initialized with genuine cryptographic bcrypt hashes
const inMemoryUsers: Map<string, StoredUser> = new Map([
  [
    "admin",
    {
      id: "admin-system-uuid",
      username: "admin",
      passwordHash: "$2b$10$nfRMdoWxnJAIMhYLHAGLduif6oUHspjPHIYcwWN9NoHFdLK2EUNlC",
      name: "Genesoft Administrator",
      role: "ADMIN" as Role,
      email: "admin@genesoftinfotech.com",
      isActive: true,
      campaignName: "System All Access",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  [
    "agent",
    {
      id: "agent-sarah-uuid",
      username: "agent",
      passwordHash: "$2b$10$STN923Td5cqDw33OxbQqjOYfWC92MjEvNi89W3q4U.FI8RJavSzD6",
      name: "Sarah Connor",
      role: "AGENT" as Role,
      email: "sarah.connor@genesoftinfotech.com",
      isActive: true,
      campaignName: "USA Health Advantage",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  [
    "closer",
    {
      id: "closer-alex-uuid",
      username: "closer",
      passwordHash: "$2b$10$od6CyB6m3FhVBJ60j/U6YecDpbk4MNfAhxbyT2CL5gRo/tux7jAqK",
      name: "Alex Morgan",
      role: "CLOSER" as Role,
      email: "alex.morgan@genesoftinfotech.com",
      isActive: true,
      campaignName: "Medicare Advantage Plus",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
]);

export function getStoredUser(username: string): StoredUser | undefined {
  return inMemoryUsers.get(username.toLowerCase());
}

export function listStoredUsers(): StoredUser[] {
  return Array.from(inMemoryUsers.values());
}

export function saveStoredUser(user: StoredUser): void {
  inMemoryUsers.set(user.username.toLowerCase(), user);
}

export function updateStoredUserPassword(username: string, newPasswordHash: string): boolean {
  const user = inMemoryUsers.get(username.toLowerCase());
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  return true;
}

export function toggleStoredUserActive(username: string): boolean | null {
  const user = inMemoryUsers.get(username.toLowerCase());
  if (!user) return null;
  user.isActive = !user.isActive;
  return user.isActive;
}

export function deleteStoredUser(username: string): boolean {
  return inMemoryUsers.delete(username.toLowerCase());
}
