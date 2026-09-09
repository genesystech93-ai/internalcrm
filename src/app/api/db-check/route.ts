import { NextResponse } from "next/server";
import { prisma, getEffectiveDatabaseUrl } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const dbUrl = getEffectiveDatabaseUrl();

  const envPresent = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    SUPABASE_DATABASE_URL: !!process.env.SUPABASE_DATABASE_URL,
    DB_HOST: !!process.env.DB_HOST,
  };

  if (!dbUrl || !dbUrl.trim()) {
    return NextResponse.json({
      status: "DISCONNECTED",
      latencyMs: 0,
      host: "Not Configured",
      port: "None",
      database: "None",
      userMasked: "None",
      isPooler: false,
      tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
      lastChecked: new Date().toLocaleTimeString("en-US"),
      error: "DATABASE_URL is missing in Vercel Environment Variables.",
      recommendation:
        "Go to Vercel Project Settings > Environment Variables, add DATABASE_URL (check Production, Preview & Development), then click 'Redeploy' on the Deployments tab.",
      envPresent,
    });
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
    host = parsed.hostname || host;
    port = parsed.port || port;
    database = parsed.pathname.replace(/^\//, "") || database;
    isPooler = host.includes("pooler") || port === "6543";
    if (parsed.username) {
      userMasked = `${parsed.username.slice(0, 8)}...`;
    }
  } catch {
    if (dbUrl.includes("@")) {
      const parts = dbUrl.split("@")[1].split("/")[0];
      host = parts.split(":")[0] || host;
      port = parts.split(":")[1] || port;
      isPooler = host.includes("pooler");
    }
  }

  if (dbUrl.includes("[YOUR-PASSWORD]") || dbUrl.includes("[PASSWORD]")) {
    return NextResponse.json({
      status: "DISCONNECTED",
      latencyMs: 0,
      host,
      port,
      database,
      userMasked,
      isPooler,
      tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
      lastChecked: new Date().toLocaleTimeString("en-US"),
      error: "DATABASE_URL contains literal placeholder '[YOUR-PASSWORD]'.",
      recommendation:
        "In Vercel Project Settings > Environment Variables, edit DATABASE_URL and replace '[YOUR-PASSWORD]' with your actual Supabase database password, then click Redeploy.",
      envPresent,
    });
  }

  try {
    // Probe
    await prisma.$queryRawUnsafe("SELECT 1 as ping");
    const latencyMs = Date.now() - startTime;

    const [users, leads, campaigns, settings] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.lead.count().catch(() => 0),
      prisma.campaign.count().catch(() => 0),
      prisma.systemSetting.count().catch(() => 0),
    ]);

    const status = latencyMs > 1200 ? "DEGRADED" : "CONNECTED";

    return NextResponse.json({
      status,
      latencyMs,
      host,
      port,
      database,
      userMasked,
      isPooler,
      tableCounts: {
        users,
        leads,
        campaigns,
        systemSettings: settings,
      },
      lastChecked: new Date().toLocaleTimeString("en-US"),
      envPresent,
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const rawError = err instanceof Error ? err.message : String(err);

    let recommendation = "In Vercel Project Settings > Environment Variables, check your DATABASE_URL.";
    if (rawError.includes("ENOIDENTIFIER") || rawError.includes("no tenant identifier")) {
      recommendation =
        "Supabase pooler requires username format 'postgres.tcdyyznmarfplpaovcdl'. In Vercel Project Settings > Environment Variables, update your DATABASE_URL username to 'postgres.tcdyyznmarfplpaovcdl' and redeploy.";
    } else if (rawError.includes("P1000") || rawError.includes("Authentication failed")) {
      recommendation =
        "Authentication failed. In Vercel Project Settings > Environment Variables, verify your database password in DATABASE_URL.";
    } else if (rawError.includes("P1001") || rawError.includes("Can't reach database server")) {
      if (host.includes(".supabase.co") && !host.includes(".pooler.supabase.com")) {
        recommendation =
          "Vercel cannot reach Supabase Direct host (IPv6-only). In Vercel Project Settings > Environment Variables, change DATABASE_URL to use the Supabase IPv4 Pooler host (aws-0-ap-south-1.pooler.supabase.com:6543) with username postgres.tcdyyznmarfplpaovcdl.";
      } else {
        recommendation =
          "Database server unreachable. In Vercel Project Settings > Environment Variables, verify DATABASE_URL is set for Production and trigger a Redeploy on the Deployments tab.";
      }
    } else if (rawError.includes("timeout") || rawError.includes("timed out")) {
      recommendation =
        "Connection timed out. In Vercel Environment Variables, append '?pgbouncer=true&connection_limit=1&sslmode=require' to DATABASE_URL and trigger a redeploy.";
    }

    return NextResponse.json({
      status: "DISCONNECTED",
      latencyMs,
      host,
      port,
      database,
      userMasked,
      isPooler,
      tableCounts: { users: 0, leads: 0, campaigns: 0, systemSettings: 0 },
      lastChecked: new Date().toLocaleTimeString("en-US"),
      error: rawError.length > 350 ? `${rawError.slice(0, 350)}...` : rawError,
      recommendation,
      envPresent,
    });
  }
}
