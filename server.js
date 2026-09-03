// Production server entrypoint for GoDaddy cPanel / PM2 / Cloud hosting
const path = require("path");
const fs = require("fs");

const port = process.env.PORT || "3000";
const host = process.env.HOSTNAME || "0.0.0.0";

process.env.PORT = port;
process.env.HOSTNAME = host;

const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServer)) {
  console.log(`[CRM Server] Launching Next.js standalone engine on ${host}:${port}...`);
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
