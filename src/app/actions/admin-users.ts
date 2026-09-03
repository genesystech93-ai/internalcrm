"use server";

import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { validateUsername, validatePassword, sanitizeText, validateEmail } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import {
  getStoredUser,
  listStoredUsers,
  saveStoredUser,
  updateStoredUserPassword,
  toggleStoredUserActive,
  deleteStoredUser,
} from "@/lib/user-store";

export interface UserManagementItem {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  campaignName?: string | null;
  createdAt: string;
}

export interface ChangePasswordState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function getAdminUsersAction(): Promise<UserManagementItem[]> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return [];

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { team: true },
    });

    if (users.length > 0) {
      return users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        campaignName: u.team?.name || "General Floor",
        createdAt: u.createdAt.toISOString(),
      }));
    }
  } catch {
    // Dev fallback
  }

  // Return shared dynamic user store
  return listStoredUsers().map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    campaignName: u.campaignName || "General Floor",
    createdAt: u.createdAt,
  }));
}

export async function adminChangePasswordAction(
  prevState: ChangePasswordState | null,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Only administrators can change user passwords." };
  }

  const rawUsername = formData.get("username");
  const rawPassword = formData.get("newPassword");

  const userVal = validateUsername(rawUsername);
  if (!userVal.valid) {
    return { error: userVal.error || "Please select or provide a valid username." };
  }

  const passVal = validatePassword(rawPassword);
  if (!passVal.valid) {
    return { error: passVal.error || "New password must be at least 6 characters long." };
  }

  const username = userVal.value;
  const newPassword = passVal.value;

  try {
    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    // Keep memory store in sync
    updateStoredUserPassword(username, hashedPassword);

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return {
      success: true,
      message: `Password for @${updatedUser.username} (${updatedUser.name}) was successfully updated.`,
    };
  } catch (err: unknown) {
    console.warn("Prisma update warning (checking dev fallback):", err);

    const hashedPassword = await hashPassword(newPassword);
    const updated = updateStoredUserPassword(username, hashedPassword);

    if (updated) {
      revalidatePath("/admin");
      revalidatePath("/admin/employees");
      return {
        success: true,
        message: `Password for @${username} was successfully updated (Development Mode).`,
      };
    }

    return { error: "Failed to update password. User not found or database unreachable." };
  }
}

export async function createEmployeeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  const rawUsername = formData.get("username");
  const rawPassword = formData.get("password");
  const rawName = formData.get("name");
  const rawRole = (formData.get("role")?.toString() || "AGENT") as Role;
  const rawEmail = formData.get("email")?.toString().trim();

  const userVal = validateUsername(rawUsername);
  if (!userVal.valid) {
    return { error: userVal.error || "Invalid username. Must be 3-32 characters, letters, numbers, dot, underscore, hyphen." };
  }

  const passVal = validatePassword(rawPassword);
  if (!passVal.valid) {
    return { error: passVal.error || "Password must be at least 6 characters." };
  }

  const name = sanitizeText(rawName, 100);
  if (!name || name.length < 2) {
    return { error: "Employee full name is required." };
  }

  let email: string | null = null;
  if (rawEmail) {
    const emailVal = validateEmail(rawEmail);
    if (!emailVal.valid) {
      return { error: "Invalid employee email address format." };
    }
    email = emailVal.value;
  }

  const username = userVal.value;
  const password = passVal.value;

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return { error: `Username @${username} is already taken. Please choose another username.` };
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: rawRole,
        email,
        isActive: true,
      },
    });

    // Also sync to memory store
    saveStoredUser({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      passwordHash: hashedPassword,
      isActive: true,
      campaignName: "USA Health Advantage",
      createdAt: newUser.createdAt.toISOString(),
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return {
      success: true,
      message: `Employee account @${newUser.username} (${newUser.name}) created successfully with role ${newUser.role}.`,
    };
  } catch {
    // Dev fallback
    const devExisting = getStoredUser(username);
    if (devExisting) {
      return { error: `Username @${username} is already taken.` };
    }

    const hashedPassword = await hashPassword(password);
    saveStoredUser({
      id: `dev-user-${Date.now()}`,
      username,
      name,
      email,
      role: rawRole,
      passwordHash: hashedPassword,
      isActive: true,
      campaignName: "USA Health Advantage",
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return {
      success: true,
      message: `Employee account @${username} (${name}) created successfully (Dev Mode).`,
    };
  }
}

export async function toggleEmployeeStatusAction(username: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  if (username === "admin" || username === session.username) {
    return { error: "Security restriction: You cannot deactivate your own active Administrator account." };
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return { error: "User not found." };

    const updated = await prisma.user.update({
      where: { username },
      data: { isActive: !user.isActive },
    });

    toggleStoredUserActive(username);

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return {
      success: true,
      message: `Account @${username} has been marked as ${updated.isActive ? "ACTIVE" : "DEACTIVATED"}.`,
    };
  } catch {
    // Dev fallback
    const newStatus = toggleStoredUserActive(username);
    if (newStatus !== null) {
      revalidatePath("/admin");
      revalidatePath("/admin/employees");
      return {
        success: true,
        message: `Account @${username} status toggled to ${newStatus ? "ACTIVE" : "DEACTIVATED"} (Dev Mode).`,
      };
    }
    return { error: "User not found." };
  }
}

export async function deleteEmployeeAction(username: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Unauthorized. Administrator authority required." };
  }

  if (username === "admin" || username === session.username) {
    return { error: "Security restriction: The Master Administrator account cannot be deleted." };
  }

  try {
    await prisma.user.delete({ where: { username } });
    deleteStoredUser(username);

    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    return { success: true, message: `Account @${username} removed from the CRM.` };
  } catch {
    // Dev fallback
    const deleted = deleteStoredUser(username);
    revalidatePath("/admin");
    revalidatePath("/admin/employees");
    if (deleted) {
      return { success: true, message: `Account @${username} removed (Dev Mode).` };
    }
    return { error: "User not found." };
  }
}
