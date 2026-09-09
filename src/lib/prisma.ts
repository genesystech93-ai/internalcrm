import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Robust sanitizer for DATABASE_URL across Vercel & serverless environments
function sanitizeDatabaseUrl(raw?: string): string {
  if (!raw || !raw.trim()) {
    return process.env.DATABASE_URL?.trim() || "";
  }

  let url = raw.trim();

  // Strip accidental "DATABASE_URL=" prefix if user pasted the full line into environment settings
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
    if (url.includes("@")) {
      url = `postgresql://${url.replace(/^([a-zA-Z0-9_-]+:\/\/)/, "")}`;
    } else {
      return url;
    }
  }

  // VERCEL / AWS LAMBDA FIX:
  // Direct Supabase hostnames (db.<ref>.supabase.co:5432) resolve ONLY to IPv6, which AWS Lambda / Vercel
  // cannot reach over IPv4 outbound. Auto-rewrite direct Supabase hosts to the IPv4 Transaction Pooler.
  if (url.includes(".supabase.co") && !url.includes(".pooler.supabase.com")) {
    try {
      const parsed = new URL(url.replace(/^postgresql:\/\//, "http://").replace(/^postgres:\/\//, "http://"));
      const hostMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
      const projectRef = hostMatch ? hostMatch[1] : (parsed.username.includes(".") ? parsed.username.split(".")[1] : "tcdyyznmarfplpaovcdl");
      const pass = parsed.password || process.env.DB_PASSWORD || "";
      const dbName = parsed.pathname.replace(/^\//, "") || "postgres";

      // Reconstruct using Supabase IPv4 Pooler
      return `postgresql://postgres.${projectRef}:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/${dbName}?pgbouncer=true&connection_limit=1&sslmode=require`;
    } catch {
      return url;
    }
  }

  // Ensure SSL and connection_limit parameters are present for Supabase pooler
  if (url.includes(".pooler.supabase.com")) {
    if (!url.includes("sslmode=")) {
      url += (url.includes("?") ? "&" : "?") + "sslmode=require";
    }
    if (!url.includes("pgbouncer=")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
    if (!url.includes("connection_limit=")) {
      url += (url.includes("?") ? "&" : "?") + "connection_limit=1";
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

    return sanitizeDatabaseUrl(`postgresql://${user}:${pass}@${host}:${port}/${dbName}${params}`);
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

// Cache prisma on globalThis to reuse database connections across warm serverless function invocations on Vercel
globalForPrisma.prisma = prisma;
