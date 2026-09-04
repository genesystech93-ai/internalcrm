import { PrismaClient } from "@prisma/client";

async function testUrl(label: string, url: string) {
  console.log(`\n--------------------------------------------------`);
  console.log(`Testing: ${label}`);
  console.log(`Endpoint: ${url.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`--------------------------------------------------`);
  
  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
  });

  try {
    const start = Date.now();
    const result = await client.$queryRawUnsafe("SELECT 1 as probe");
    const duration = Date.now() - start;
    console.log(`[PASS] Connected successfully in ${duration}ms!`, result);
    return true;
  } catch (err: any) {
    console.error(`[FAIL] Connection error:`, err?.message || err);
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function run() {
  const currentEnvUrl = process.env.DATABASE_URL || "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

  console.log("==================================================");
  console.log("   GENESOFT CRM — SUPABASE CONNECTIVITY DIAGNOSTIC ");
  console.log("==================================================");

  // 1. Test Current .env configuration
  await testUrl("Active .env Configuration (DATABASE_URL)", currentEnvUrl);

  // 2. Test Pooler Port 6543 (Transaction Mode)
  await testUrl(
    "Pooler Port 6543 (Transaction Mode)",
    "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
  );

  // 3. Test Pooler Port 5432 (Session Mode)
  await testUrl(
    "Pooler Port 5432 (Session Mode)",
    "postgresql://postgres.tcdyyznmarfplpaovcdl:SURAJmagar9890@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
  );

  // 4. Direct DB Host (Port 5432)
  await testUrl(
    "Direct DB Host (Port 5432)",
    "postgresql://postgres:SURAJmagar9890@db.tcdyyznmarfplpaovcdl.supabase.co:5432/postgres?sslmode=require"
  );

  console.log("\n==================================================");
  console.log("DIAGNOSTIC ADVICE FOR GODADDY / CPANEL HOSTING:");
  console.log("1. If all endpoints fail with 'Can\\'t reach database server':");
  console.log("   GoDaddy's firewall blocks outbound port 5432/6543 by default.");
  console.log("   Open cPanel -> Firewall or contact GoDaddy Support to allow:");
  console.log("   Outbound TCP port 5432 and 6543 to aws-0-ap-south-1.pooler.supabase.com");
  console.log("==================================================");
}

run();
