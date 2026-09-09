import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || "genesoft-crm-production-secret-jwt-key-2026-supersecure";
  return new TextEncoder().encode(secret);
}

const SECRET_KEY = getJwtSecret();

const SESSION_COOKIE_NAME = "crm_session";

export interface SessionUser {
  userId: string;
  username: string;
  name: string;
  role: Role;
  email?: string | null;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get("genesoft_session")?.value ||
      cookieStore.get("session")?.value ||
      cookieStore.get("token")?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  };
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions);
  cookieStore.set("genesoft_session", token, cookieOptions);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("genesoft_session");
  cookieStore.delete("session");
  cookieStore.delete("token");
}
