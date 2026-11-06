#!/usr/bin/env node
// Salva un alert normalizzato in .pipeline/<ID>/alert.json, l'input della pipeline del corso 03.
// L'alert va dal connettore al file senza passare dal modello: nessun campo si perde o si riscrive.
//
//   node scripts/save-alert.js <progetto> <id>      dalla radice del progetto che riceve la pipeline
//
// Esce con 0 se ha salvato, con 1 se l'alert non esiste o la configurazione è sbagliata,
// con 3 se .pipeline/<ID>/alert.json c'è già: un alert si prende in carico una volta sola.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createConnector } = require("../mcp/connector");

async function main() {
  const [project, id] = process.argv.slice(2);
  if (!project || !id) {
    console.error("Uso: node scripts/save-alert.js <progetto> <id>, per esempio payments-api PAY-160644");
    process.exit(2);
  }
  const alert = await createConnector(process.env).getAlert(project, id);
  const file = path.join(process.cwd(), ".pipeline", alert.id, "alert.json");
  if (fs.existsSync(file)) {
    console.error(`${path.relative(process.cwd(), file)} esiste già: l'alert ${alert.id} è già in carico.`);
    process.exit(3);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(alert, null, 2) + "\n");
  console.log(`Salvato ${path.relative(process.cwd(), file)} · ${alert.severity} · ${alert.title}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
