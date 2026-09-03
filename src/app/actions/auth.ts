"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { extractClientIp, checkIpAuthorization } from "@/lib/ip-guard";
import { validateUsername, validatePassword } from "@/lib/sanitize";
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginAttempts } from "@/lib/rate-limiter";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Role } from "@prisma/client";

export interface AuthState {
  error?: string;
  success?: boolean;
}

import { getStoredUser } from "@/lib/user-store";

export async function loginAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawUsername = formData.get("username");
  const rawPassword = formData.get("password");

  // Input Sanitization & Security Validation (Blocks SQLi vectors, extra characters, and buffer floods)
  const userValidation = validateUsername(rawUsername);
  if (!userValidation.valid) {
    return { error: userValidation.error || "Invalid username format." };
  }

  const passValidation = validatePassword(rawPassword);
  if (!passValidation.valid) {
    return { error: passValidation.error || "Invalid password format." };
  }

  const username = userValidation.value;
  const password = passValidation.value;

  const reqHeaders = await headers();
  const clientIp = extractClientIp(reqHeaders);
  const rateLimitKey = `${clientIp}_${username}`;

  // Rate Limiting & Brute-Force Lockout Defense
  const rateCheck = checkLoginRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return {
      error: `Too many failed login attempts. Temporarily locked out. Please retry after ${rateCheck.retryAfterSeconds} seconds.`,
    };
  }

  let authenticatedUser: { id: string; username: string; name: string; role: Role; email?: string | null } | null = null;

  try {
    // 1. Primary: Query PostgreSQL database via Prisma
    const dbUser = await prisma.user.findUnique({
      where: { username },
    });

    if (dbUser && dbUser.isActive) {
      const isMatch = await verifyPassword(password, dbUser.password);
      if (isMatch) {
        authenticatedUser = {
          id: dbUser.id,
          username: dbUser.username,
          name: dbUser.name,
          role: dbUser.role,
          email: dbUser.email,
        };
      } else {
        recordFailedLoginAttempt(rateLimitKey);
        return { error: "Invalid username or password." };
      }
    } else if (dbUser && !dbUser.isActive) {
      return { error: "This user account has been deactivated by the Admin." };
    }
  } catch (dbErr) {
    console.warn("Database unreachable, checking Admin-provisioned fallback accounts...", dbErr);
  }

  // 2. Fallback: If DB is unreachable (e.g. local PostgreSQL server not started), verify Admin-created credentials
  if (!authenticatedUser) {
    const fallback = getStoredUser(username);
    if (fallback) {
      if (!fallback.isActive) {
        return { error: "This user account has been deactivated by the Admin." };
      }
      const isMatch = await verifyPassword(password, fallback.passwordHash);
      if (isMatch) {
        authenticatedUser = {
          id: fallback.id,
          username: fallback.username,
          name: fallback.name,
          role: fallback.role,
          email: fallback.email,
        };
      } else {
        recordFailedLoginAttempt(rateLimitKey);
        return { error: "Invalid username or password." };
      }
    } else {
      recordFailedLoginAttempt(rateLimitKey);
      return { error: "Invalid username or password." };
    }
  }

  // Login successful: reset failed attempt counter
  resetLoginAttempts(rateLimitKey);

  // 3. IP Whitelist Enforcement (Admin is EXEMPT and can log in anywhere)
  if (authenticatedUser.role !== "ADMIN") {
    const { authorized, restrictionEnabled } = await checkIpAuthorization(clientIp);

    if (restrictionEnabled && !authorized) {
      return {
        error: `Access Denied: Employee logins are restricted to whitelisted office networks. Your current IP (${clientIp}) is not authorized.`,
      };
    }
  }

  // 4. Issue edge JWT session token
  const token = await createSessionToken({
    userId: authenticatedUser.id,
    username: authenticatedUser.username,
    name: authenticatedUser.name,
    role: authenticatedUser.role,
    email: authenticatedUser.email,
  });

  await setSessionCookie(token);

  // 5. Role-based redirect
  if (authenticatedUser.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/dashboard");
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
