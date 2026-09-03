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

// 2. Load root .env variables into process.env if not already provided by hosting panel
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

// 3. Phusion Passenger assigns a dynamic port or socket via process.env.PORT
const port = process.env.PORT || 3000;
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

console.log(`[CRM Server] Initializing Next.js application for GoDaddy / Passenger on port ${port}...`);

app
  .prepare()
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
