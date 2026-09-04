// Production server entrypoint for GoDaddy cPanel Phusion Passenger & Cloud hosting
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const path = require("path");
const fs = require("fs");

// 1. Process safety: prevent container exit on unhandled promise rejections
process.on("uncaughtException", (err) => {
  console.error("[CRM Server UncaughtException]:", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRM Server UnhandledRejection]:", reason);
});

// 2. Load root .env variables into process.env if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (val) {
          process.env[key] = val;
        }
      }
    });
    console.log("[CRM Server] Loaded environment settings from .env file.");
  } catch (e) {
    console.error("[CRM Server] Could not read .env file:", e);
  }
}

// 2b. Assemble DATABASE_URL from individual DB_* environment variables if provided
if (process.env.DB_HOST && process.env.DB_USER && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("<from-hosting>"))) {
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

  process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${dbName}${params}`;
  console.log(`[CRM Server] Assembled DATABASE_URL from DB_HOST=${host}, DB_PORT=${port}, DB_NAME=${dbName}`);
}

// 2c. Sanitize DATABASE_URL so Prisma never throws protocol validation error
if (process.env.DATABASE_URL) {
  let u = process.env.DATABASE_URL.trim();
  if (u.startsWith("DATABASE_URL=")) u = u.slice("DATABASE_URL=".length).trim();
  while ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1).trim();
  }
  process.env.DATABASE_URL = u;
}

// 2c. Fast TCP probe to detect if hosting firewall blocks port 6543 or 5432
const net = require("net");
function probeTcpPort(host, port, timeoutMs = 1200) {
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

async function autoDetectDatabasePort() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || !rawUrl.includes("pooler.supabase.com")) return;

  const host = "aws-0-ap-south-1.pooler.supabase.com";
  const isPort6543 = rawUrl.includes(":6543");
  const isPort5432 = rawUrl.includes(":5432");

  if (isPort6543) {
    const p6543Ok = await probeTcpPort(host, 6543, 1200);
    if (!p6543Ok) {
      console.log("[CRM Server] Outbound port 6543 blocked/timed out. Probing fallback port 5432...");
      const p5432Ok = await probeTcpPort(host, 5432, 1200);
      if (p5432Ok) {
        console.log("[CRM Server] Port 5432 is OPEN! Automatically switching DATABASE_URL to Session Mode on port 5432.");
        process.env.DATABASE_URL = rawUrl
          .replace(":6543", ":5432")
          .replace("?pgbouncer=true&connection_limit=1&", "?")
          .replace("?pgbouncer=true&", "?")
          .replace("&pgbouncer=true", "")
          .replace("&connection_limit=1", "");
      } else {
        console.warn("[CRM Server] Warning: Both ports 6543 and 5432 appear blocked on this host. Outbound firewall or Supabase Network Restrictions may be active.");
      }
    } else {
      console.log("[CRM Server] Supabase Pooler Port 6543 verified reachable via TCP.");
    }
  } else if (isPort5432) {
    const p5432Ok = await probeTcpPort(host, 5432, 1200);
    if (!p5432Ok) {
      console.log("[CRM Server] Outbound port 5432 blocked/timed out. Probing fallback port 6543...");
      const p6543Ok = await probeTcpPort(host, 6543, 1200);
      if (p6543Ok) {
        console.log("[CRM Server] Port 6543 is OPEN! Automatically switching DATABASE_URL to Transaction Mode on port 6543.");
        const base = rawUrl.replace(":5432", ":6543");
        if (!base.includes("pgbouncer=true")) {
          const sep = base.includes("?") ? "&" : "?";
          process.env.DATABASE_URL = `${base}${sep}pgbouncer=true&connection_limit=1`;
        } else {
          process.env.DATABASE_URL = base;
        }
      }
    } else {
      console.log("[CRM Server] Supabase Pooler Port 5432 verified reachable via TCP.");
    }
  }
}

// 3. Phusion Passenger assigns a dynamic port or socket via process.env.PORT
const port = process.env.PORT || 3000;
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

console.log(`[CRM Server] Initializing Next.js application for GoDaddy / Passenger on port ${port}...`);

autoDetectDatabasePort().then(() => {
  return app.prepare();
})
  .then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`[CRM Server] Ready and actively listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("[CRM Server] Error during app.prepare():", err);
    process.exit(1);
  });
