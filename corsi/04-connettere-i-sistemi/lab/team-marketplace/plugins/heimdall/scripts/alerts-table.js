#!/usr/bin/env node
// La tabella di riferimento degli alert, senza il modello.
// Usa lo stesso connettore del server MCP: se la tabella del Data Retriever è diversa, ha ragione questa.
//
//   node scripts/alerts-table.js                   tutti i progetti
//   node scripts/alerts-table.js payments-api      un progetto

"use strict";

const { createConnector, SEVERITIES } = require("../mcp/connector");

const REASONS = { closed: "chiusi", notSecurity: "non di sicurezza", duplicate: "duplicati", belowThreshold: "sotto soglia" };

function where(a) {
  const place = a.location.line ? `${a.location.file}:${a.location.line}` : a.location.file;
  return a.component ? `${a.component.name} ${a.component.version} (${place})` : place;
}

async function main() {
  const connector = createConnector(process.env);
  const wanted = process.argv.slice(2);
  const projects = wanted.length ? wanted : (await connector.listProjects()).map((p) => p.project);

  const all = [];
  const notes = [];
  for (const name of projects) {
    let result;
    try {
      result = await connector.listAlerts(name);
    } catch (err) {
      notes.push(`${name}: errore · ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    const { alerts, discarded } = result;
    all.push(...alerts);
    const parts = Object.entries(discarded).filter(([, n]) => n).map(([k, n]) => `${n} ${REASONS[k]}`);
    notes.push(`${name}: ${alerts.length} aperti${parts.length ? `, scartati ${parts.join(", ")}` : ""}`);
  }
  // dal più grave; a parità di gravità, per id: lo stesso ordine che chiediamo al Data Retriever
  all.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.id.localeCompare(b.id));
  console.log("| Id | Progetto | Scanner | Gravità | Tipo | CWE | Dove |");
  console.log("|----|----------|---------|---------|------|-----|------|");
  for (const a of all) {
    console.log(`| ${a.id} | ${a.project} | ${a.source} | ${a.severity} | ${a.kind} | ${a.cwe || "—"} | ${where(a)} |`);
  }
  console.log(`\n${all.length} alert · backend ${connector.backend}`);
  for (const n of notes) console.log(`- ${n}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
