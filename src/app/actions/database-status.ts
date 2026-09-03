"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface DatabaseDiagnosticResult {
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  latencyMs: number;
  host: string;
  port: string;
  database: string;
  userMasked: string;
  isPooler: boolean;
  tableCounts: {
    users: number;
    leads: number;
    campaigns: number;
    systemSettings: number;
  };
  lastChecked: string;
  error?: string;
  recommendation?: string;
}

export async function checkDatabaseHealthAction(): Promise<DatabaseDiagnosticResult> {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";

  // Parse connection URL metadata safely
  const dbUrl = process.env.DATABASE_URL || "";
  let host = "Unknown";
  let port = "5432";
  let database = "postgres";
  let userMasked = "postgres";
  let isPooler = false;

  try {
    const parsed = new URL(dbUrl.replace(/^postgresql:\/\//, "http://"));
    host = parsed.hostname || "aws-0-ap-south-1.pooler.supabase.com";
    port = parsed.port || "5432";
    database = parsed.pathname.replace(/^\//, "") || "postgres";
    isPooler = host.includes("pooler") || port === "6543";
    if (parsed.username) {
      userMasked = `${parsed.username.slice(0, 8)}...`;
    }
  } catch {
    // URL parse fallback
    if (dbUrl.includes("@")) {
      const parts = dbUrl.split("@")[1].split("/")[0];
      host = parts.split(":")[0] || host;
      port = parts.split(":")[1] || port;
      isPooler = host.includes("pooler");
    }
  }

  const startTime = Date.now();

  try {
    // 1. Probe database connection with lightweight query
    await prisma.$queryRawUnsafe("SELECT 1 as probe");
    const latencyMs = Date.now() - startTime;

    // 2. Fetch table counts for integrity check
    const [usersCount, leadsCount, campaignsCount, settingsCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.lead.count().catch(() => 0),
      prisma.campaign.count().catch(() => 0),
      prisma.systemSetting.count().catch(() => 0),
    ]);

    const status = latencyMs > 600 ? "DEGRADED" : "CONNECTED";

    return {
      status,
      latencyMs,
      host,
      port,
      database,
      userMasked: isAdmin ? userMasked : "******",
      isPooler,
      tableCounts: {
        users: usersCount,
        leads: leadsCount,
        campaigns: campaignsCount,
        systemSettings: settingsCount,
      },
      lastChecked: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const rawError = err instanceof Error ? err.message : String(err);

    let recommendation = "Verify your DATABASE_URL in environment settings.";
    if (rawError.includes("P1001") || rawError.includes("Can't reach")) {
      recommendation = "Cannot reach Supabase host. Ensure your GoDaddy/cPanel host allows outbound TCP on port 5432.";
    } else if (rawError.includes("P1000") || rawError.includes("Authentication failed")) {
      recommendation = "Authentication failed. Check your Supabase database password in .env.";
    } else if (rawError.includes("timeout") || rawError.includes("ETIMEDOUT")) {
      recommendation = "Connection timed out. Check network latency or IPv6 pooler connectivity.";
    }

    return {
      status: "DISCONNECTED",
      latencyMs,
      host,
      port,
      database,
      userMasked: isAdmin ? userMasked : "******",
      isPooler,
      tableCounts: {
        users: 0,
        leads: 0,
        campaigns: 0,
        systemSettings: 0,
      },
      lastChecked: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      error: rawError.length > 250 ? `${rawError.slice(0, 250)}...` : rawError,
      recommendation,
    };
  }
}
