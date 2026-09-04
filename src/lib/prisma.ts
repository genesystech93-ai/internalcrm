import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Robust sanitizer for DATABASE_URL in cloud environments (cPanel/GoDaddy)
function sanitizeDatabaseUrl(raw?: string): string {
  const fallback =
    "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

  if (!raw) return fallback;

  let url = raw.trim();

  // Strip accidental "DATABASE_URL=" prefix if user pasted the full line into cPanel's Value field
  if (url.startsWith("DATABASE_URL=")) {
    url = url.slice("DATABASE_URL=".length).trim();
  }

  // Strip enclosing single or double quotes
  while (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  // Validate protocol
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    // If it has username:password@host, prepend postgresql://
    if (url.includes("@")) {
      url = `postgresql://${url.replace(/^([a-zA-Z0-9_-]+:\/\/)/, "")}`;
    } else {
      return fallback;
    }
  }

  return url;
}

// Assembles DATABASE_URL from individual DB_* environment variables or returns sanitized DATABASE_URL
function getEffectiveDatabaseUrl(): string {
  if (
    process.env.DB_HOST &&
    process.env.DB_USER &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("<from-hosting>"))
  ) {
    const host = String(process.env.DB_HOST).replace(/['"]/g, "").trim();
    const port = String(process.env.DB_PORT || (host.includes("pooler.supabase.com") ? "6543" : "5432")).replace(/['"]/g, "").trim();
    const dbName = String(process.env.DB_NAME || "postgres").replace(/['"]/g, "").trim();
    const user = encodeURIComponent(String(process.env.DB_USER).replace(/['"]/g, "").trim());
    const pass = encodeURIComponent(process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).replace(/^['"]|['"]$/g, "") : "");

    let params = "";
    if (host.includes("pooler.supabase.com")) {
      params = port === "6543" ? "?pgbouncer=true&connection_limit=1&sslmode=require" : "?sslmode=require";
    } else if (host === "localhost" || host === "127.0.0.1") {
      params = "?schema=public";
    } else {
      params = "?sslmode=prefer";
    }

    return `postgresql://${user}:${pass}@${host}:${port}/${dbName}${params}`;
  }

  return sanitizeDatabaseUrl(process.env.DATABASE_URL);
}

const dbUrl = getEffectiveDatabaseUrl();

// Sync sanitized URL back to process.env so schema.prisma env("DATABASE_URL") receives it
process.env.DATABASE_URL = dbUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
