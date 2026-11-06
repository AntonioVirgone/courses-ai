#!/usr/bin/env node
// L'analisi statica di un alert preso in carico: scrive .pipeline/<ID>/analysis.json e ne stampa il riassunto.
// Il Security Analyst parte da qui: i fatti li misura questo programma, il giudizio lo dà l'agente.
//
//   node scripts/analyze.js <ID>            dalla radice del progetto, dopo save-alert.js
//   node scripts/analyze.js <ID> --no-save  stampa il riassunto e non salva niente: per provare
//
// Esce con 0 se ha salvato, con 1 se l'alert manca o l'analisi fallisce, con 2 se l'uso è sbagliato,
// con 3 se .pipeline/<ID>/analysis.json c'è già: un artefatto della pipeline non si riscrive.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createConnector } = require("../mcp/connector");
const { analyzeAlert, short, shortType } = require("../analysis");

const PLUGIN = JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".claude-plugin", "plugin.json"), "utf8"));

function summary(a) {
  const out = [];
  const b = a.build;
  out.push(`Analisi di ${a.alert} · ${a.project} · ${b.tool ? `Maven, Java ${b.java} (${b.javaAt})` : b.note}`);
  const ix = a.index;
  out.push(`Indice: ${ix.mainFiles} file, ${ix.types} tipi, ${ix.methods} metodi, ${ix.entryPoints.length} punti d'ingresso; ${ix.testFiles} file di test`);

  if (a.dependency) {
    const d = a.dependency;
    out.push("", `Dipendenza ${d.name}`);
    if (d.declared.at) {
      const prop = d.declared.versionProperty ? `, versione in ${d.declared.versionAt} (proprietà ${d.declared.versionProperty})` : "";
      out.push(`  dichiarata in ${d.declared.at}, diretta, scope ${d.declared.scope}: ${d.declared.version}${prop}`);
    } else out.push(`  ${d.declared.note}`);
    if (d.fixedIn) out.push(`  corretta in ${d.fixedIn.version} (${d.fixedIn.released}) · richiede Java ${d.fixedIn.javaMin}`);
    else out.push(`  versione corretta: nessun metadato`);
    out.push(`  versioni corrette compatibili con Java ${b.java}: ${d.compatibleFixes.length ? d.compatibleFixes.join(", ") : "nessuna"}`);
    if (d.javaUpgrade) out.push(`  aggiornare vuol dire passare da Java ${d.javaUpgrade.from} a Java ${d.javaUpgrade.to} (${d.javaUpgrade.at})`);

    const u = a.usages;
    out.push("", `Usi nel codice: ${u.imports.length} import, ${u.calls.length} chiamate in ${new Set(u.calls.map((c) => c.in)).size} metodi`);
    // una riga per metodo: le righe e le API usate, nell'ordine in cui compaiono
    const byMethod = new Map();
    for (const c of [...u.calls, ...u.untyped]) {
      if (!byMethod.has(c.in)) byMethod.set(c.in, { lines: new Set(), apis: [] });
      const m = byMethod.get(c.in);
      m.file = path.basename(c.at.replace(/:\d+$/, ""));
      m.lines.add(Number(c.at.split(":").pop()));
      const api = c.api ? `${shortType(c.api.replace(/\.[^.]+$/, ""))}.${c.api.split(".").pop()}` : c.call;
      if (!m.apis.includes(api)) m.apis.push(api);
    }
    for (const [id, m] of byMethod) {
      out.push(`  ${short(id).padEnd(26)} ${m.file}:${[...m.lines].sort((x, y) => x - y).join(",")}`);
      out.push(`  ${"".padEnd(26)} ${m.apis.join(", ")}`);
    }
    if (u.untyped.length) out.push(`  ?.nome: una chiamata in catena, di cui il parser minimale non conosce il tipo`);
  }
  if (a.location) {
    const l = a.location;
    out.push("", `Riga dell'alert: ${l.at}${l.exists ? "" : " · il file non esiste"}`);
    if (l.text) out.push(`  ${l.text}`);
    out.push(`  nel metodo ${l.in ? short(l.in) : "— (fuori da un metodo)"}`);
  }

  out.push("", "Raggiungibile da:");
  if (!a.reachability.length) out.push("  nessun punto d'ingresso");
  for (const c of a.reachability) out.push(`  ${c.entry.label.padEnd(30)} ${c.steps.map((s) => short(s.method)).join(" → ")}`);
  if (a.unreached.length) out.push(`  non raggiunti: ${a.unreached.map(short).join(", ")}`);

  out.push("", "Test che passano di qui:");
  if (!a.tests.length) out.push("  nessuno");
  for (const t of a.tests) out.push(`  ${short(t.test).padEnd(46)} → ${short(t.reaches)}`);

  if (a.upgradeImpact && a.upgradeImpact.length) {
    out.push("", `Con ${a.dependency.fixedIn.version} cambia:`);
    for (const x of a.upgradeImpact) {
      const used = x.usedAt.length ? ` · usato in ${x.usedAt.map((at) => path.basename(at)).join(", ")}` : "";
      out.push(`  ${x.api ? shortType(x.api) + ": " : ""}${x.change}${used}`);
    }
  }
  if (a.grep && a.grep.terms.length) {
    out.push("", `Testo e codice: ${a.grep.lines} righe contengono ${a.grep.terms.join(", ")}; ${a.grep.code} sono codice`);
    for (const t of a.grep.textOnly) out.push(`  ${path.basename(t.at).padEnd(32)} ${t.why}: ${t.text}`);
  }
  return out.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const noSave = args.includes("--no-save");
  const [id] = args.filter((x) => !x.startsWith("--"));
  if (!id) {
    console.error("Uso: node scripts/analyze.js <ID> [--no-save], per esempio PAY-160644, dalla radice del progetto");
    process.exit(2);
  }
  const root = process.cwd();
  const dir = path.join(root, ".pipeline", id);
  const alertFile = path.join(dir, "alert.json");
  if (!fs.existsSync(alertFile)) {
    console.error(`Manca ${path.relative(root, alertFile)}: prima prendi in carico l'alert con save-alert.js.`);
    process.exit(1);
  }
  const out = path.join(dir, "analysis.json");
  if (!noSave && fs.existsSync(out)) {
    console.error(`${path.relative(root, out)} esiste già: l'analisi di ${id} è fatta. Usa --no-save per rifarla senza salvarla.`);
    process.exit(3);
  }

  const alert = JSON.parse(fs.readFileSync(alertFile, "utf8"));
  let component = null;
  let componentError = null;
  if (alert.kind === "dependency" && alert.component) {
    try {
      component = await createConnector(process.env).getComponent(alert.project, alert.component.name);
    } catch (err) {
      componentError = err.message; // l'analisi del codice si fa lo stesso
    }
  }
  const analysis = analyzeAlert(root, alert, { component, tool: { name: "heimdall analyze.js", version: PLUGIN.version } });
  if (componentError) analysis.dependency.metadata = `errore · ${componentError}`;

  if (!noSave) fs.writeFileSync(out, JSON.stringify(analysis, null, 2) + "\n");
  console.log(summary(analysis));
  if (componentError) console.log(`\nMetadati della libreria non disponibili: ${componentError}`);
  console.log(noSave ? "\nNon salvato (--no-save)" : `\nSalvato ${path.relative(root, out)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
