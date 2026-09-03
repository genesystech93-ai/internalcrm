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
}
