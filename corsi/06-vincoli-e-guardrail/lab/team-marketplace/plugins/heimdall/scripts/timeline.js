#!/usr/bin/env node
// La timeline di un alert, dagli artefatti in .pipeline/<ID>/: chi ha fatto che cosa, in che ordine, con quale esito.
// Non usa il modello: legge i file, quindi racconta quello che è successo davvero. Viene dal corso 03.
//
//   node scripts/timeline.js <ID>        dalla radice del progetto
//   node scripts/timeline.js <cartella>  per esempio .pipeline/PAY-160644
//
// Esce con 0 se l'ultimo piano è approvato, 1 se la pipeline è ancora aperta, 2 se non trova la cartella,
// 3 se ha esaurito i tentativi: decide una persona.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_PLANS = 3;

function fail(message) {
  process.stderr.write(message + "\n");
  process.exit(2);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const time = (file) => fs.statSync(file).mtime.toTimeString().slice(0, 8);
const row = (file, step, who, what) => `${time(file)}  ${step.padEnd(4)}${who.padEnd(18)}${what.padEnd(26)}${path.basename(file)}`;

const arg = process.argv[2];
if (!arg) fail("Uso: node scripts/timeline.js <ID>, per esempio PAY-160644");
const dir = /^[A-Z]+-\d+$/.test(arg) ? path.resolve(".pipeline", arg) : path.resolve(arg);
if (!fs.existsSync(dir)) fail(`Non trovo ${path.relative(process.cwd(), dir) || dir}: lancia lo script dalla radice del progetto.`);

const alertId = path.basename(dir);
const lines = [];
const alertFile = path.join(dir, "alert.json");
const alert = readJson(alertFile);
if (alert) {
  const where = alert.component ? `${alert.component.name} ${alert.component.version}` : `${alert.location.file}:${alert.location.line}`;
  lines.push(`${alertId} · ${alert.title} (${alert.severity}, ${alert.source})`, `          ${where}`, "");
  lines.push(row(alertFile, "", "save-alert.js", "alert preso in carico"));
} else {
  lines.push(`${alertId} · alert.json mancante o illeggibile`, "");
}

const analysisFile = path.join(dir, "analysis.json");
const analysis = readJson(analysisFile);
if (analysis) {
  const chains = (analysis.reachability || []).length;
  lines.push(row(analysisFile, "", "analyze.js", `${chains} ${chains === 1 ? "catena" : "catene"} dagli ingressi`));
}

let last = null;
let plans = 0;
for (let v = 1; fs.existsSync(path.join(dir, `plan-v${v}.md`)); v++) {
  plans = v;
  lines.push(row(path.join(dir, `plan-v${v}.md`), `v${v}`, "security-analyst", "piano scritto"));
  const verdictFile = path.join(dir, `verdict-v${v}.json`);
  if (!fs.existsSync(verdictFile)) {
    last = null;
    break;
  }
  last = readJson(verdictFile);
  if (!last) {
    lines.push(row(verdictFile, `v${v}`, "supervisor", "verdetto illeggibile"));
    break;
  }
  const approved = last.decision === "approved";
  lines.push(row(verdictFile, `v${v}`, "supervisor", approved ? "approvato" : "rifiutato"));
  for (const violation of last.violations || []) lines.push(`${"".padEnd(32)}· ${violation.constraint}`);
}

let code;
lines.push("");
if (last && last.decision === "approved") {
  lines.push(`Esito: piano v${last.plan} approvato. Il prossimo passo è il Resolver.`);
  code = 0;
} else if (plans >= MAX_PLANS && last && last.decision === "rejected") {
  lines.push(`Esito: ${MAX_PLANS} piani rifiutati. La pipeline si ferma: decide una persona.`);
  code = 3;
} else if (plans === 0) {
  lines.push(analysis ? "Esito: nessun piano ancora. Il prossimo passo è il Security Analyst." : "Esito: manca l'analisi. Il prossimo passo è analyze.js.");
  code = 1;
} else if (!last) {
  lines.push(`Esito: il piano v${plans} aspetta il verdetto. Il prossimo passo è il Supervisor.`);
  code = 1;
} else {
  lines.push(`Esito: piano v${plans} rifiutato. Il prossimo passo è il piano v${plans + 1}.`);
  code = 1;
}

process.stdout.write(lines.join("\n") + "\n");
process.exit(code);
