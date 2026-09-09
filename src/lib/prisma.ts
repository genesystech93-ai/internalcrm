import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  currentDbUrl: string | undefined;
};

// Robust sanitizer for DATABASE_URL across Vercel & serverless environments
export function sanitizeDatabaseUrl(raw?: string): string {
  let url = (raw || "").trim();

  // If empty, check other environment variables common in Vercel / hosting
  if (!url) {
    url = (
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      ""
    ).trim();
  }

  if (!url) {
    return "";
  }

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

  // VERCEL / AWS LAMBDA FIX 1:
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
      url = `postgresql://postgres.${projectRef}:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/${dbName}?pgbouncer=true&connection_limit=1&sslmode=require`;
    } catch {
      // Keep url as is if parsing fails
    }
  }

  // VERCEL / SUPABASE FIX 2:
  // When using the Supabase Pooler, the username MUST include the project tenant (e.g. postgres.tcdyyznmarfplpaovcdl).
  // If the user provided plain "postgres", the pooler throws ENOIDENTIFIER (no tenant identifier provided).
  if (url.includes(".pooler.supabase.com")) {
    try {
      const parsed = new URL(url.replace(/^postgresql:\/\//, "http://").replace(/^postgres:\/\//, "http://"));
      if (parsed.username === "postgres") {
        parsed.username = "postgres.tcdyyznmarfplpaovcdl";
        url = parsed.toString().replace(/^http:\/\//, "postgresql://");
      }
    } catch {
      // Keep url as is if parsing fails
    }

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
export function getEffectiveDatabaseUrl(): string {
  const directEnv =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL;

  if (
    process.env.DB_HOST &&
    process.env.DB_USER &&
    (!directEnv || directEnv.includes("<from-hosting>"))
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

  return sanitizeDatabaseUrl(directEnv);
}

// Initialize DATABASE_URL into process.env before PrismaClient loads
const effectiveDbUrl = getEffectiveDatabaseUrl();
if (effectiveDbUrl) {
  process.env.DATABASE_URL = effectiveDbUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: effectiveDbUrl
      ? {
          db: {
            url: effectiveDbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

