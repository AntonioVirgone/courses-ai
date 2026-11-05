#!/usr/bin/env node
// Hook PreToolUse: fa rispettare il contratto degli artefatti della pipeline in .pipeline/.
//
//   .pipeline/vincoli.md            input del progetto: l'agente non lo scrive
//   .pipeline/<ALERT>/alert.json    input della pipeline: l'agente non lo scrive
//   .pipeline/<ALERT>/plan-vN.md    piano dell'analyst, versione N
//   .pipeline/<ALERT>/verdict-vN.json  verdetto del supervisor sul piano N
//
// Regole:
// - un artefatto esistente non si riscrive: una rielaborazione è una versione nuova;
// - i piani sono consecutivi, al massimo MAX_PLANS, e un piano nuovo richiede il rifiuto del precedente;
// - un verdetto segue lo schema e riguarda un piano che esiste.
//
// Legge l'evento JSON da stdin. Per bloccare esce con codice 2 e scrive il motivo su stderr:
// Claude Code e Copilot CLI trattano entrambi l'uscita 2 di un PreToolUse come un diniego.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_PLANS = 3; // il piano v1 e al massimo due rielaborazioni
const ARTIFACT = /(?:^|[\\/])\.pipeline[\\/]([A-Z]+-\d+)[\\/]([^\\/]+)$/;
const INPUT = /(?:^|[\\/])\.pipeline[\\/](?:vincoli\.md|[A-Z]+-\d+[\\/]alert\.json)$/;
const PLAN = /^plan-v(\d+)\.md$/;
const VERDICT = /^verdict-v(\d+)\.json$/;
const DECISIONS = ["approved", "rejected"];

function deny(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

function versions(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => pattern.exec(name))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

function readVerdict(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// Restituisce il primo problema del verdetto, oppure null se rispetta lo schema.
function verdictProblem(verdict, alertId, version) {
  if (!verdict || typeof verdict !== "object" || Array.isArray(verdict)) return "il verdetto non è un oggetto JSON";
  if (verdict.alert !== alertId) return `"alert" deve essere "${alertId}"`;
  if (verdict.plan !== version) return `"plan" deve essere ${version}, il numero del piano valutato`;
  if (!DECISIONS.includes(verdict.decision)) return `"decision" deve essere "approved" o "rejected"`;
  if (!Array.isArray(verdict.violations)) return `"violations" deve essere una lista, anche vuota`;
  for (const v of verdict.violations) {
    if (!v || typeof v.constraint !== "string" || !v.constraint.trim() || typeof v.detail !== "string" || !v.detail.trim()) {
      return `ogni violazione ha "constraint" e "detail", due testi non vuoti`;
    }
  }
  if (verdict.decision === "rejected" && verdict.violations.length === 0) return "un rifiuto elenca almeno una violazione";
  if (verdict.decision === "approved" && verdict.violations.length > 0) return "un piano con violazioni non si approva";
  if ("notes" in verdict && typeof verdict.notes !== "string") return `"notes", se c'è, è un testo`;
  return null;
}

// Restituisce il primo problema del piano, oppure null se rispetta il formato.
function planProblem(content, alertId, version) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
  if (!front) return "il piano inizia con un frontmatter tra due righe ---, con alert e version";
  if (!new RegExp(`^alert:\\s*${alertId}\\s*$`, "m").test(front[1])) return `nel frontmatter serve "alert: ${alertId}"`;
  if (!new RegExp(`^version:\\s*${version}\\s*$`, "m").test(front[1])) return `nel frontmatter serve "version: ${version}"`;
  for (const heading of ["## Modifiche", "## File toccati", "## Dipendenze"]) {
    if (!content.includes(heading + "\n")) return `manca la sezione «${heading}»`;
  }
  if (version > 1 && !content.includes(`## Risposta al verdetto v${version - 1}\n`)) {
    return `un piano rielaborato ha la sezione «## Risposta al verdetto v${version - 1}», che risponde a ogni violazione`;
  }
  return null;
}

function checkPlan(dir, alertId, version, content) {
  const plans = versions(dir, PLAN);
  const next = plans.length + 1;
  const verdicts = versions(dir, VERDICT);
  const last = verdicts.length ? readVerdict(path.join(dir, `verdict-v${verdicts[verdicts.length - 1]}.json`)) : null;

  if (last && last.decision === "approved") {
    deny(`Il piano v${last.plan} è già approvato: la pipeline di ${alertId} è chiusa. Non servono altri piani.`);
  }
  if (version > MAX_PLANS) {
    deny(
      `Limite raggiunto: ${MAX_PLANS} piani per ${alertId}, tutti rifiutati. Non scrivere altri piani: ` +
        "fermati, riassumi i verdetti e passa la decisione a una persona."
    );
  }
  if (version !== next) deny(`Il prossimo piano di ${alertId} è plan-v${next}.md, non plan-v${version}.md.`);
  if (version > 1 && !verdicts.includes(version - 1)) {
    deny(`Prima di scrivere plan-v${version}.md serve il verdetto sul piano v${version - 1} (verdict-v${version - 1}.json).`);
  }
  if (typeof content === "string") {
    const problem = planProblem(content, alertId, version);
    if (problem) deny(`plan-v${version}.md non rispetta il formato: ${problem}.`);
  }
}

function checkVerdict(dir, alertId, version, content) {
  if (!fs.existsSync(path.join(dir, `plan-v${version}.md`))) {
    deny(`Non esiste plan-v${version}.md: un verdetto riguarda un piano già scritto.`);
  }
  if (typeof content !== "string") return;
  let verdict;
  try {
    verdict = JSON.parse(content);
  } catch {
    deny(`verdict-v${version}.json non è JSON valido. Scrivi solo l'oggetto del verdetto, senza testo intorno.`);
  }
  const problem = verdictProblem(verdict, alertId, version);
  if (problem) deny(`verdict-v${version}.json non rispetta lo schema: ${problem}.`);
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0); // input illeggibile: non blocchiamo
  }
  const tool = event.tool_name;
  const input = event.tool_input || {};
  const file = input.file_path;
  if (!file || (tool !== "Write" && tool !== "Edit")) process.exit(0);

  if (INPUT.test(file)) deny("Gli input della pipeline (vincoli.md, alert.json) non si modificano: li prepara una persona.");
  const m = ARTIFACT.exec(file);
  if (!m) process.exit(0); // file fuori da .pipeline/<ALERT>/: non è affar nostro

  const [, alertId, name] = m;
  const dir = path.dirname(file);
  if (fs.existsSync(file)) {
    deny(`${name} esiste già e non si riscrive: ogni passo della pipeline resta come traccia. Una rielaborazione è una versione nuova.`);
  }
  if (tool === "Edit") deny(`${name} non esiste: un artefatto nuovo si crea con Write.`);

  const plan = PLAN.exec(name);
  const verdict = VERDICT.exec(name);
  if (plan) checkPlan(dir, alertId, Number(plan[1]), input.content);
  else if (verdict) checkVerdict(dir, alertId, Number(verdict[1]), input.content);
  else deny(`In .pipeline/${alertId}/ si scrivono solo plan-vN.md e verdict-vN.json, non ${name}.`);
  process.exit(0);
});
