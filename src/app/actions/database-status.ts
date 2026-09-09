"use server";

import { prisma, getEffectiveDatabaseUrl } from "@/lib/prisma";
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
  let isAdmin = false;
  try {
    const session = await getSession();
    isAdmin = session?.role === "ADMIN";
  } catch {
    // Non-request context fallback
  }

  // Parse connection URL metadata safely
  const dbUrl = getEffectiveDatabaseUrl();

  if (!dbUrl || !dbUrl.trim()) {
    return {
      status: "DISCONNECTED",
      latencyMs: 0,
      host: "Not Configured",
      port: "None",
      database: "None",
      userMasked: "None",
      isPooler: false,
      tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
      lastChecked: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      error: "DATABASE_URL environment variable is missing on Vercel.",
      recommendation: "In Vercel Project Settings > Environment Variables, add DATABASE_URL (for Production, Preview & Development), then click 'Redeploy' on the Deployments tab.",
    };
  }

  let host = "aws-0-ap-south-1.pooler.supabase.com";
  let port = "6543";
  let database = "postgres";
  let userMasked = "postgres.tcdyyznmarfplpaovcdl";
  let isPooler = true;

  try {
    const parsed = new URL(
      dbUrl.replace(/^postgresql:\/\//, "http://").replace(/^postgres:\/\//, "http://")
    );
    host = parsed.hostname || "aws-0-ap-south-1.pooler.supabase.com";
    port = parsed.port || "6543";
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

  if (dbUrl.includes("[YOUR-PASSWORD]") || dbUrl.includes("[PASSWORD]")) {
    return {
      status: "DISCONNECTED",
      latencyMs: 0,
      host,
      port,
      database,
      userMasked: isAdmin ? userMasked : "******",
      isPooler,
      tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
      lastChecked: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      error: "DATABASE_URL contains literal placeholder '[YOUR-PASSWORD]'.",
      recommendation: "In Vercel Project Settings > Environment Variables, edit DATABASE_URL and replace '[YOUR-PASSWORD]' with your actual Supabase database password, then click Redeploy.",
    };
  }

  const startTime = Date.now();

  try {
    // 1. Ensure database connection pooler socket is initialized & warm
    let probeSuccess = false;
    let lastProbeError: unknown = null;

    try {
      await prisma.$queryRawUnsafe("SELECT 1 as probe");
      probeSuccess = true;
    } catch (err1) {
      lastProbeError = err1;
      // Brief pause to allow pooler socket to re-establish
      await new Promise((r) => setTimeout(r, 300));
      try {
        await prisma.$connect();
        await prisma.$queryRawUnsafe("SELECT 1 as probe");
        probeSuccess = true;
      } catch (err2) {
        lastProbeError = err2;
      }
    }

    if (!probeSuccess && lastProbeError) {
      throw lastProbeError;
    }

    // 2. Measure actual steady-state query roundtrip latency
    const pingStart = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1 as ping");
    const latencyMs = Date.now() - pingStart;

    // 3. Fetch table counts for integrity check
    const [usersCount, leadsCount, campaignsCount, settingsCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.lead.count().catch(() => 0),
      prisma.campaign.count().catch(() => 0),
      prisma.systemSetting.count().catch(() => 0),
    ]);

    // Steady-state cloud roundtrip threshold (warm connection is ~50ms; jitter up to 1200ms is normal)
    const status = latencyMs > 1200 ? "DEGRADED" : "CONNECTED";

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

    // Provide pinpoint guidance for Vercel & Supabase deployments
    let recommendation = "In Vercel Project Settings > Environment Variables, check your DATABASE_URL.";
    if (rawError.includes("ENOIDENTIFIER") || rawError.includes("no tenant identifier")) {
      recommendation = "Supabase pooler requires username format 'postgres.tcdyyznmarfplpaovcdl'. In Vercel Project Settings > Environment Variables, update your DATABASE_URL username to 'postgres.tcdyyznmarfplpaovcdl' and redeploy.";
    } else if (rawError.includes("P1000") || rawError.includes("Authentication failed")) {
      recommendation = "Authentication failed. In Vercel Project Settings > Environment Variables, verify your database password in DATABASE_URL.";
    } else if (rawError.includes("P1001") || rawError.includes("Can't reach database server")) {
      if (host.includes(".supabase.co") && !host.includes(".pooler.supabase.com")) {
        recommendation = "Vercel cannot reach Supabase Direct host (IPv6-only). In Vercel Project Settings > Environment Variables, change DATABASE_URL to use the Supabase IPv4 Pooler host (aws-0-ap-south-1.pooler.supabase.com:6543) with username postgres.tcdyyznmarfplpaovcdl.";
      } else {
        recommendation = "Database server unreachable. In Vercel Project Settings > Environment Variables, verify DATABASE_URL is set for Production and ensure you trigger a Redeploy on the Deployments tab.";
      }
    } else if (rawError.includes("timeout") || rawError.includes("timed out")) {
      recommendation = "Connection timed out. In Vercel Environment Variables, append '?pgbouncer=true&connection_limit=1&sslmode=require' to DATABASE_URL and trigger a redeploy.";
    } else if (rawError.includes("nonempty URL") || rawError.includes("URL is empty")) {
      recommendation = "DATABASE_URL is missing in this Vercel deployment. Add it in Vercel Project Settings > Environment Variables and click Redeploy.";
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
