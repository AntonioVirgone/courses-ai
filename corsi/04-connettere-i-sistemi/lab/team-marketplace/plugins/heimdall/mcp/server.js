#!/usr/bin/env node
// Server MCP di Heimdall, senza dipendenze. È l'unica strada tra gli agenti e gli scanner.
// Trasporto stdio: un messaggio JSON-RPC 2.0 per riga su stdin e stdout.
// Strumenti: list_projects, list_alerts, get_alert, backend_status.
// Il backend (simulato o reale) si sceglie con HEIMDALL_BACKEND: gli strumenti non cambiano.

"use strict";

const readline = require("node:readline");
const { createConnector, SEVERITIES } = require("./connector");

const SERVER_INFO = { name: "heimdall", version: "0.1.0" };
const FALLBACK_PROTOCOL_VERSION = "2025-06-18";

const PROJECT = { type: "string", description: "Il nome del progetto, come lo restituisce list_projects, per esempio «payments-api»." };

const TOOLS = [
  {
    name: "list_projects",
    description: "Elenca i progetti che Heimdall può leggere, con lo stack e lo scanner che li analizza.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_alerts",
    description:
      "Restituisce gli alert di sicurezza aperti di un progetto, già normalizzati nello schema comune di Heimdall " +
      "e ordinati dal più grave. Riporta anche quanti alert dello scanner sono stati scartati e perché.",
    inputSchema: {
      type: "object",
      properties: {
        project: PROJECT,
        min_severity: { type: "string", enum: SEVERITIES, description: "Facoltativo: esclude gli alert meno gravi di questa soglia." },
      },
      required: ["project"],
      additionalProperties: false,
    },
  },
  {
    name: "get_alert",
    description: "Restituisce un alert completo nello schema comune di Heimdall, dato il suo id (per esempio «PAY-160644»).",
    inputSchema: {
      type: "object",
      properties: { project: PROJECT, id: { type: "string", description: "L'id dell'alert, come lo restituisce list_alerts." } },
      required: ["project", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "backend_status",
    description:
      "Dice quale backend è attivo, simulato o reale, e per il reale quali impostazioni mancano. " +
      "Non mostra mai il valore delle credenziali.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

let connector;
function getConnector() {
  // creato alla prima chiamata: un errore di configurazione arriva come risposta dello strumento
  connector = connector || createConnector(process.env);
  return connector;
}

async function callTool(name, args) {
  const c = getConnector();
  switch (name) {
    case "list_projects":
      return c.listProjects();
    case "list_alerts":
      return c.listAlerts(String(args.project || ""), { minSeverity: args.min_severity });
    case "get_alert":
      return c.getAlert(String(args.project || ""), String(args.id || ""));
    case "backend_status":
      return c.status();
    default:
      throw new Error(`Strumento sconosciuto: ${name}`);
  }
}

async function handle(message) {
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
        const result = await callTool(params.name, params.arguments || {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        // connector = undefined: dopo un errore di configurazione si rilegge l'ambiente alla chiamata successiva
        connector = undefined;
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    default:
      if (id === undefined) return undefined; // notifica (es. notifications/initialized): nessuna risposta
      throw Object.assign(new Error(`Metodo non supportato: ${method}`), { code: -32601 });
  }
}

function send(payload) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...payload }) + "\n");
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    send({ id: null, error: { code: -32700, message: "JSON non valido" } });
    return;
  }
  try {
    const result = await handle(message);
    if (message.id !== undefined && result !== undefined) send({ id: message.id, result });
  } catch (err) {
    send({ id: message.id ?? null, error: { code: err.code || -32603, message: err.message } });
  }
});
