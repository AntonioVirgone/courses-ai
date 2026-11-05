#!/usr/bin/env node
// Un finto SonarQube in locale, per provare il backend reale senza un server aziendale.
// Risponde solo a GET /api/issues/search con le issue dello scenario orders-service,
// e solo a chi manda «Authorization: Bearer <FAKE_SONARQUBE_TOKEN>».
//
//   FAKE_SONARQUBE_TOKEN=un-token-inventato node scripts/fake-sonarqube.js [porta]
//
// Porta predefinita: 9000. I dati sono inventati (ADR-0004).

"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const token = process.env.FAKE_SONARQUBE_TOKEN;
if (!token) {
  console.error("Imposta FAKE_SONARQUBE_TOKEN: è il token che il finto server accetta.");
  process.exit(2);
}
const port = Number(process.argv[2] || 9000);
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "scenarios", "orders-service", "sonarqube-issues.json"), "utf8"));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const reply = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.headers.authorization !== `Bearer ${token}`) {
    console.log(`${req.method} ${url.pathname} → 401`);
    return reply(401, { errors: [{ msg: "Authentication required" }] });
  }
  if (req.method !== "GET" || url.pathname !== "/api/issues/search") {
    console.log(`${req.method} ${url.pathname} → 404`);
    return reply(404, { errors: [{ msg: "Unknown url" }] });
  }
  const project = url.searchParams.get("components");
  const issues = data.issues.filter((i) => i.project === project);
  console.log(`GET /api/issues/search?components=${project} → 200, ${issues.length} issue`);
  reply(200, { paging: { pageIndex: 1, pageSize: issues.length, total: issues.length }, issues });
});

server.listen(port, "127.0.0.1", () => console.log(`Finto SonarQube su http://localhost:${port} · Ctrl+C per fermarlo`));
