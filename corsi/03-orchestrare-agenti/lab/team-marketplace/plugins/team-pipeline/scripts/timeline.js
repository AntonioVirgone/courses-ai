#!/usr/bin/env node
// Stampa la timeline di una pipeline a partire dagli artefatti in .pipeline/<ALERT>/.
// Non usa il modello: legge i file, quindi racconta ciò che è successo davvero.
//
// Uso: node timeline.js [cartella]   (default: la sola cartella in .pipeline/ della directory corrente)
// Esce con 0 se l'ultimo piano è approvato, 1 se la pipeline è ancora aperta, 3 se ha esaurito i tentativi.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_PLANS = 3;

function fail(message) {
  process.stderr.write(message + "\n");
  process.exit(2);
}

function findDir(arg) {
  if (arg) return path.resolve(arg);
  const root = path.resolve(".pipeline");
  if (!fs.existsSync(root)) fail("Non trovo .pipeline/ nella cartella corrente. Indica la cartella dell'alert.");
  const dirs = fs.readdirSync(root).filter((d) => /^[A-Z]+-\d+$/.test(d) && fs.statSync(path.join(root, d)).isDirectory());
  if (dirs.length !== 1) fail(`In .pipeline/ ci sono ${dirs.length} alert: indica quale, per esempio .pipeline/${dirs[0] || "ACME-101"}.`);
  return path.join(root, dirs[0]);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const time = (file) => fs.statSync(file).mtime.toTimeString().slice(0, 8);

const dir = findDir(process.argv[2]);
const alertId = path.basename(dir);
const alert = readJson(path.join(dir, "alert.json"));
const lines = [];

if (alert) {
  lines.push(`${alertId} · ${alert.title} (${alert.severity})`);
  lines.push(`        ${alert.location.file}:${alert.location.line} · da ${alert.source}`);
} else {
  lines.push(`${alertId} · alert.json mancante o illeggibile`);
}

let last = null;
let plans = 0;
for (let v = 1; fs.existsSync(path.join(dir, `plan-v${v}.md`)); v++) {
  plans = v;
  const planFile = path.join(dir, `plan-v${v}.md`);
  lines.push(`${time(planFile)}  v${v}  analyst     piano scritto        plan-v${v}.md`);
  const verdictFile = path.join(dir, `verdict-v${v}.json`);
  if (!fs.existsSync(verdictFile)) {
    last = null;
    break;
  }
  last = readJson(verdictFile);
  if (!last) {
    lines.push(`${time(verdictFile)}  v${v}  supervisor  verdetto illeggibile  verdict-v${v}.json`);
    break;
  }
  if (last.decision === "approved") {
    lines.push(`${time(verdictFile)}  v${v}  supervisor  approvato            verdict-v${v}.json`);
  } else {
    lines.push(`${time(verdictFile)}  v${v}  supervisor  rifiutato            verdict-v${v}.json`);
    for (const violation of last.violations || []) lines.push(`                              · ${violation.constraint}`);
  }
}

let code;
if (last && last.decision === "approved") {
  lines.push(`Esito: piano v${last.plan} approvato. Il prossimo passo è il Resolver.`);
  code = 0;
} else if (plans >= MAX_PLANS && last && last.decision === "rejected") {
  lines.push(`Esito: ${MAX_PLANS} piani rifiutati. La pipeline si ferma: decide una persona.`);
  code = 3;
} else if (plans === 0) {
  lines.push("Esito: nessun piano ancora. Il prossimo passo è l'analyst.");
  code = 1;
} else if (!last) {
  lines.push(`Esito: il piano v${plans} aspetta il verdetto. Il prossimo passo è il supervisor.`);
  code = 1;
} else {
  lines.push(`Esito: piano v${plans} rifiutato. Il prossimo passo è il piano v${plans + 1}.`);
  code = 1;
}

process.stdout.write(lines.join("\n") + "\n");
process.exit(code);
