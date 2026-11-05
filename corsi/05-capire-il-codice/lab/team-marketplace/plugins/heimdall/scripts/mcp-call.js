#!/usr/bin/env node
// Un client MCP minimo, per provare il server di Heimdall senza un agente.
// Avvia mcp/server.js, fa la stretta di mano e chiama uno strumento.
//
//   node scripts/mcp-call.js                       elenca gli strumenti (tools/list)
//   node scripts/mcp-call.js list_projects
//   node scripts/mcp-call.js list_alerts '{"project":"payments-api"}'
//
// Stampa su stdout il testo restituito dallo strumento. Esce con 1 se lo strumento risponde con un errore.

"use strict";

const { spawn } = require("node:child_process");
const path = require("node:path");
const readline = require("node:readline");

const [tool, rawArgs = "{}"] = process.argv.slice(2);
let args;
try {
  args = JSON.parse(rawArgs);
} catch {
  console.error(`Gli argomenti devono essere un oggetto JSON, per esempio '{"project":"payments-api"}'.`);
  process.exit(2);
}

const server = spawn(process.execPath, [path.join(__dirname, "..", "mcp", "server.js")], {
  stdio: ["pipe", "pipe", "inherit"],
  env: process.env, // il server legge HEIMDALL_BACKEND e le altre impostazioni da qui
});
const send = (message) => server.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");

const replies = readline.createInterface({ input: server.stdout });
replies.on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id === 1) {
    // stretta di mano riuscita: notifica e poi la richiesta vera
    send({ method: "notifications/initialized" });
    send(tool ? { id: 2, method: "tools/call", params: { name: tool, arguments: args } } : { id: 2, method: "tools/list" });
    return;
  }
  if (message.id !== 2) return;
  server.stdin.end();
  if (message.error) {
    console.error(`Errore JSON-RPC ${message.error.code}: ${message.error.message}`);
    process.exitCode = 1;
  } else if (!tool) {
    for (const t of message.result.tools) console.log(`${t.name}\n  ${t.description}`);
  } else {
    for (const c of message.result.content) console.log(c.text);
    if (message.result.isError) process.exitCode = 1;
  }
});

send({ id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "mcp-call", version: "0.1.0" } } });
