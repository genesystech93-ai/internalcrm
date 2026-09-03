import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Safe fallback URL if GoDaddy / hosting build-time environment variable is missing
const defaultDbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: defaultDbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
