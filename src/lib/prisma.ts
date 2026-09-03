import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Robust sanitizer for DATABASE_URL in cloud environments (cPanel/GoDaddy)
function sanitizeDatabaseUrl(raw?: string): string {
  const fallback =
    "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

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

const dbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);

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
