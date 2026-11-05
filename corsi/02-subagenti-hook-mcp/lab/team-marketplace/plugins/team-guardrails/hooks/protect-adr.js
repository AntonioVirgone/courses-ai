#!/usr/bin/env node
// Hook PreToolUse: un ADR esistente in docs/adr/ non si riscrive.
// È ammessa solo l'aggiunta della nota «> **Superata da ADR-NNNN** …» lasciando intatto il resto.
// Legge l'evento JSON da stdin. Per bloccare esce con codice 2 e scrive il motivo su stderr:
// Claude Code e Copilot CLI trattano entrambi l'uscita 2 di un PreToolUse come un diniego.

"use strict";

const fs = require("node:fs");

const ADR_PATH = /(^|[\\/])docs[\\/]adr[\\/]\d{4}-[^\\/]+\.md$/;
const SUPERSEDED_NOTE = /^> \*\*Superata da ADR-\d{4}\*\*/m;
const REASON =
  "Un ADR esistente non si riscrive. Scrivi un nuovo ADR con la decisione aggiornata " +
  "e in cima a quello vecchio aggiungi solo la riga «> **Superata da ADR-NNNN** su …. Il resto resta in vigore.»";

function deny(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

// Vero se la modifica aggiunge solo la nota «Superata da» e conserva il testo che sostituisce.
function onlyAddsSupersededNote(oldText, newText) {
  if (typeof oldText !== "string" || typeof newText !== "string") return false;
  if (!newText.includes(oldText)) return false;
  const added = newText.replace(oldText, "");
  return SUPERSEDED_NOTE.test(added) && !SUPERSEDED_NOTE.test(oldText);
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
  if (!file || !ADR_PATH.test(file) || !fs.existsSync(file)) process.exit(0); // ADR nuovo o file qualsiasi

  if (tool === "Write") deny(REASON);
  if (tool === "Edit") {
    if (input.replace_all || !onlyAddsSupersededNote(input.old_string, input.new_string)) deny(REASON);
  }
  process.exit(0);
});
