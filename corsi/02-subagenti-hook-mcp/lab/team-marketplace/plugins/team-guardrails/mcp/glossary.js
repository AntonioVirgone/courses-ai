#!/usr/bin/env node
// Server MCP minimo, senza dipendenze: espone il glossario CONTEXT.md del progetto.
// Trasporto stdio: un messaggio JSON-RPC 2.0 per riga su stdin e stdout.
// Strumenti: list_terms, lookup_term.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const SERVER_INFO = { name: "acme-glossary", version: "0.1.0" };
const FALLBACK_PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "list_terms",
    description: "Elenca i termini del glossario di dominio (CONTEXT.md) con il nome usato nel codice.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "lookup_term",
    description:
      "Cerca un termine nel glossario di dominio (CONTEXT.md), in italiano o con il nome usato nel codice, " +
      "e restituisce il significato. Usalo prima di nominare un concetto di dominio in un testo o nel codice.",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "Il termine da cercare, per esempio «carrello» o «Cart»." } },
      required: ["term"],
      additionalProperties: false,
    },
  },
];

// Cerca CONTEXT.md partendo dalla cartella di lavoro e risalendo verso la radice.
function findGlossary(start) {
  if (process.env.GLOSSARY_FILE) return process.env.GLOSSARY_FILE;
  let dir = path.resolve(start);
  for (;;) {
    const candidate = path.join(dir, "CONTEXT.md");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Legge le righe della tabella: | termine | `NomeNelCodice` | significato |
function readTerms() {
  const file = findGlossary(process.cwd());
  if (!file) throw new Error("Non trovo CONTEXT.md nella cartella del progetto né nelle cartelle superiori.");
  const terms = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 3 || /^-+$/.test(cells[0]) || cells[0].toLowerCase() === "termine") continue;
    terms.push({ term: cells[0], code: cells[1].replace(/`/g, ""), meaning: cells[2] });
  }
  return { file, terms };
}

function callTool(name, args) {
  const { file, terms } = readTerms();
  if (name === "list_terms") {
    return terms.map((t) => `- ${t.term} (${t.code})`).join("\n") || `Il glossario ${file} non ha termini.`;
  }
  if (name === "lookup_term") {
    const wanted = String(args.term || "").trim().toLowerCase();
    const hit = terms.find((t) => t.term.toLowerCase() === wanted || t.code.toLowerCase() === wanted);
    if (hit) return `${hit.term} (nel codice: ${hit.code}): ${hit.meaning}`;
    return `«${args.term}» non è nel glossario. Termini disponibili: ${terms.map((t) => t.term).join(", ")}.`;
  }
  throw new Error(`Strumento sconosciuto: ${name}`);
}

function handle(message) {
  const { id, method, params = {} } = message;
  switch (method) {
    case "initialize":
      return {
        protocolVersion: params.protocolVersion || FALLBACK_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call":
      try {
        return { content: [{ type: "text", text: callTool(params.name, params.arguments || {}) }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    default:
      if (id === undefined) return undefined; // notifica (es. notifications/initialized): nessuna risposta
      throw Object.assign(new Error(`Metodo non supportato: ${method}`), { code: -32601 });
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON non valido" } }) + "\n");
    return;
  }
  try {
    const result = handle(message);
    if (message.id !== undefined && result !== undefined) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }) + "\n");
    }
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ jsonrpc: "2.0", id: message.id ?? null, error: { code: err.code || -32603, message: err.message } }) + "\n",
    );
  }
});
