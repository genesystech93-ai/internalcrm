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

import net from "net";

function probeTcpPort(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      resolved = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once("error", () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(port, host);
  });
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
  const dbUrl = process.env.DATABASE_URL || "";
  let host = "aws-0-ap-south-1.pooler.supabase.com";
  let port = "6543";
  let database = "postgres";
  let userMasked = "postgres";
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
      await new Promise((r) => setTimeout(r, 400));
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

    // Fast TCP probe on both ports to give user pinpoint guidance
    let p6543Ok = false;
    let p5432Ok = false;
    try {
      [p6543Ok, p5432Ok] = await Promise.all([
        probeTcpPort("aws-0-ap-south-1.pooler.supabase.com", 6543, 1000),
        probeTcpPort("aws-0-ap-south-1.pooler.supabase.com", 5432, 1000),
      ]);
    } catch {
      // Ignore probe errors
    }

    let recommendation = "Verify your DATABASE_URL in environment settings.";
    if (!p6543Ok && p5432Ok) {
      recommendation = "GoDaddy firewall blocked port 6543, but Port 5432 is OPEN! Update DATABASE_URL in .env to use port 5432 and click Restart in cPanel.";
    } else if (p6543Ok && !p5432Ok) {
      recommendation = "GoDaddy firewall blocked port 5432, but Port 6543 is OPEN! Update DATABASE_URL in .env to use port 6543 and click Restart in cPanel.";
    } else if (!p6543Ok && !p5432Ok) {
      recommendation = "Hosting firewall is blocking all outbound database connections (ports 5432 & 6543 closed). Contact GoDaddy Support to allow outbound TCP ports 5432/6543, or disable Supabase Network Restrictions.";
    } else if (p6543Ok && p5432Ok) {
      if (rawError.includes("P1000") || rawError.includes("Authentication failed")) {
        recommendation = "Network port is OPEN, but authentication failed. Check your Supabase database password in .env and restart the app.";
      } else {
        recommendation = "Network ports are OPEN. Prisma client is re-establishing pooler session. Click 'Test Ping Now' in 5 seconds.";
      }
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
