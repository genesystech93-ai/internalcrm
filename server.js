// Production server entrypoint for GoDaddy cPanel / PM2 / Cloud hosting
const path = require("path");
const fs = require("fs");

// 1. Process safety: prevent container exit on unhandled promise rejections
process.on("uncaughtException", (err) => {
  console.error("[CRM Server UncaughtException]:", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRM Server UnhandledRejection]:", reason);
});

// 2. Load root .env variables into process.env if not already set by cloud host
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
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (e) {
    console.error("[CRM Server] Could not read .env file:", e);
  }
}

// 3. Force 0.0.0.0 binding (Fix for 502 Bad Gateway)
// Container environments set HOSTNAME to the container ID (e.g. af4cc876e741),
// which causes Next.js to refuse connections from 127.0.0.1 reverse proxy.
const port = process.env.PORT || "3000";
const host = "0.0.0.0";

process.env.PORT = port;
process.env.HOSTNAME = "0.0.0.0";

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  console.log(`[CRM Server] Launching Next.js standalone engine on ${host}:${port}...`);
  // Also copy .env into .next/standalone if missing so internal standalone cwd has it
  const standaloneEnv = path.join(__dirname, ".next", "standalone", ".env");
  if (fs.existsSync(envPath) && !fs.existsSync(standaloneEnv)) {
    try {
      fs.copyFileSync(envPath, standaloneEnv);
    } catch (_) {}
  }
  require(standaloneServer);
} else {
  console.log(`[CRM Server] Launching Next.js standard server on ${host}:${port}...`);
  try {
    const { createServer } = require("http");
    const { parse } = require("url");
    const next = require("next");

    const app = next({ dev: false, hostname: host, port: parseInt(port, 10) });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }).listen(parseInt(port, 10), host, (err) => {
        if (err) throw err;
        console.log(`[CRM Server] Ready on http://${host}:${port}`);
      });
    });
  } catch (err) {
    if (err && err.code === "MODULE_NOT_FOUND") {
      console.error("\n==================================================================");
      console.error("[CRM Server Error] Missing npm packages in GoDaddy environment!");
      console.error("1. In GoDaddy cPanel -> 'Setup Node.js App', click 'Run NPM Install'");
      console.error("2. Ensure Node.js version is set to 20.x (or 18.x+)");
      console.error("3. Then run: npm run build");
      console.error("==================================================================\n");
    }
    throw err;
  }
}
