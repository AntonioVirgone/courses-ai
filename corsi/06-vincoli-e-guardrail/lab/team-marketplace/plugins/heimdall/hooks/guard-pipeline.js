#!/usr/bin/env node
// Hook PreToolUse su Edit e Write: il contratto degli artefatti di Heimdall in .pipeline/, dal corso 03.
//
//   .heimdall/vincoli.md                 input del progetto: lo scrive il team, l'agente non lo tocca
//   .pipeline/<ID>/alert.json            input: lo scrive save-alert.js (lezione 04)
//   .pipeline/<ID>/analysis.json         input: lo scrive analyze.js (lezione 05)
//   .pipeline/<ID>/plan-vN.md            security-analyst, il piano versione N
//   .pipeline/<ID>/verdict-vN.json       supervisor, il verdetto sul piano N
//
// Regole:
// - un artefatto esistente non si riscrive: una rielaborazione è una versione nuova;
// - i piani sono consecutivi, al massimo MAX_PLANS, e un piano nuovo richiede il rifiuto del precedente;
// - un piano ha le sezioni del Security Analyst; dal v2 risponde a ogni violazione del verdetto precedente;
// - un verdetto segue lo schema, riguarda un piano che esiste e controlla ogni vincolo di .heimdall/vincoli.md.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readEvent, deny, workingDir, constraintNames } = require("./common");

const MAX_PLANS = 3; // il piano v1 e al massimo due rielaborazioni
const ARTIFACT = /(?:^|[\\/])\.pipeline[\\/]([A-Z]+-\d+)[\\/]([^\\/]+)$/;
const CONFIG = /(?:^|[\\/])\.heimdall[\\/]/;
const INPUTS = new Set(["alert.json", "analysis.json"]);
const PLAN = /^plan-v(\d+)\.md$/;
const VERDICT = /^verdict-v(\d+)\.json$/;
const DECISIONS = ["approved", "rejected"];
const PLAN_SECTIONS = ["Pertinenza", "Diagnosi", "Evidenze", "Modifiche", "File toccati", "Dipendenze", "Test", "Rischi", "Alternative"];

function versions(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => pattern.exec(name))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// Il testo di una sezione «## Titolo», fino alla sezione successiva.
function section(content, title) {
  const m = new RegExp(`^## ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(content);
  return m ? m[1] : null;
}

// Il primo problema del piano, oppure null se rispetta il formato.
function planProblem(content, alertId, version, previous) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
  if (!front) return "il piano inizia con un frontmatter tra due righe ---, con alert e version";
  if (!new RegExp(`^alert:\\s*${alertId}\\s*$`, "m").test(front[1])) return `nel frontmatter serve "alert: ${alertId}"`;
  if (!new RegExp(`^version:\\s*${version}\\s*$`, "m").test(front[1])) return `nel frontmatter serve "version: ${version}"`;
  for (const title of PLAN_SECTIONS) {
    if (section(content, title) === null) return `manca la sezione «## ${title}»`;
  }
  if (version > 1) {
    const answer = section(content, `Risposta al verdetto v${version - 1}`);
    if (answer === null) return `un piano rielaborato ha la sezione «## Risposta al verdetto v${version - 1}», che risponde a ogni violazione`;
    const missing = ((previous && previous.violations) || []).map((v) => v.constraint).filter((c) => !answer.includes(`**${c}`));
    if (missing.length) return `«Risposta al verdetto v${version - 1}» non risponde a ${missing.map((c) => `«${c}»`).join(", ")}: una voce per violazione, che inizia con **<nome del vincolo>**`;
  }
  return null;
}

// Il primo problema del verdetto, oppure null se rispetta lo schema.
function verdictProblem(verdict, alertId, version, names) {
  if (!verdict || typeof verdict !== "object" || Array.isArray(verdict)) return "il verdetto non è un oggetto JSON";
  if (verdict.alert !== alertId) return `"alert" deve essere "${alertId}"`;
  if (verdict.plan !== version) return `"plan" deve essere ${version}, il numero del piano valutato`;
  if (!DECISIONS.includes(verdict.decision)) return `"decision" deve essere "approved" o "rejected"`;
  if (!Array.isArray(verdict.checked)) return `"checked" deve essere la lista dei vincoli controllati`;
  const unchecked = names.filter((n) => !verdict.checked.includes(n));
  if (unchecked.length) return `in "checked" mancano ${unchecked.map((n) => `"${n}"`).join(", ")}: ogni vincolo di .heimdall/vincoli.md va controllato`;
  const unknown = verdict.checked.filter((n) => !names.includes(n));
  if (unknown.length) return `${unknown.map((n) => `"${n}"`).join(", ")} non è un vincolo di .heimdall/vincoli.md`;
  if (!Array.isArray(verdict.violations)) return `"violations" deve essere una lista, anche vuota`;
  for (const v of verdict.violations) {
    if (!v || typeof v.constraint !== "string" || typeof v.detail !== "string" || !v.detail.trim()) {
      return `ogni violazione ha "constraint" e "detail", due testi non vuoti`;
    }
    if (!names.includes(v.constraint)) return `la violazione "${v.constraint}" non cita un vincolo di .heimdall/vincoli.md`;
  }
  if (verdict.decision === "rejected" && verdict.violations.length === 0) return "un rifiuto elenca almeno una violazione";
  if (verdict.decision === "approved" && verdict.violations.length > 0) return "un piano con violazioni non si approva";
  if ("notes" in verdict && typeof verdict.notes !== "string") return `"notes", se c'è, è un testo`;
  const extra = Object.keys(verdict).filter((k) => !["alert", "plan", "decision", "checked", "violations", "notes"].includes(k));
  if (extra.length) return `campi non previsti: ${extra.join(", ")}`;
  return null;
}

function checkPlan(dir, alertId, version, content) {
  const plans = versions(dir, PLAN);
  const next = plans.length + 1;
  const verdicts = versions(dir, VERDICT);
  const last = verdicts.length ? readJson(path.join(dir, `verdict-v${verdicts[verdicts.length - 1]}.json`)) : null;

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
    const previous = version > 1 ? readJson(path.join(dir, `verdict-v${version - 1}.json`)) : null;
    const problem = planProblem(content, alertId, version, previous);
    if (problem) deny(`plan-v${version}.md non rispetta il formato: ${problem}.`);
  }
}

function checkVerdict(dir, alertId, version, content) {
  if (!fs.existsSync(path.join(dir, `plan-v${version}.md`))) {
    deny(`Non esiste plan-v${version}.md: un verdetto riguarda un piano già scritto.`);
  }
  const root = path.dirname(path.dirname(dir)); // la cartella che contiene .pipeline/
  const names = constraintNames(root);
  if (!names.length) deny("Non trovo i vincoli in .heimdall/vincoli.md, nella radice del progetto: senza vincoli non c'è niente da verificare.");
  if (typeof content !== "string") return;
  let verdict;
  try {
    verdict = JSON.parse(content);
  } catch {
    deny(`verdict-v${version}.json non è JSON valido. Scrivi solo l'oggetto del verdetto, senza testo intorno.`);
  }
  const problem = verdictProblem(verdict, alertId, version, names);
  if (problem) deny(`verdict-v${version}.json non rispetta lo schema: ${problem}.`);
}

readEvent((event) => {
  const tool = event.tool_name;
  const input = event.tool_input || {};
  if (!input.file_path || (tool !== "Write" && tool !== "Edit")) return;
  const file = path.resolve(workingDir(event), input.file_path);

  if (CONFIG.test(file)) deny("I vincoli in .heimdall/ li scrive il team del progetto, con una pull request: l'agente non li modifica.");
  const m = ARTIFACT.exec(file);
  if (!m) return; // file fuori da .pipeline/<ID>/: non è affar nostro

  const [, alertId, name] = m;
  const dir = path.dirname(file);
  if (INPUTS.has(name)) deny(`${name} è un input della pipeline: lo scrive un programma (save-alert.js o analyze.js), non l'agente.`);
  if (fs.existsSync(file)) {
    deny(`${name} esiste già e non si riscrive: ogni passo della pipeline resta come traccia. Una rielaborazione è una versione nuova.`);
  }
  if (tool === "Edit") deny(`${name} non esiste: un artefatto nuovo si crea con Write.`);

  const plan = PLAN.exec(name);
  const verdict = VERDICT.exec(name);
  if (plan) checkPlan(dir, alertId, Number(plan[1]), input.content);
  else if (verdict) checkVerdict(dir, alertId, Number(verdict[1]), input.content);
  else deny(`In .pipeline/${alertId}/ si scrivono solo plan-vN.md e verdict-vN.json, non ${name}.`);
});
