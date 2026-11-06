#!/usr/bin/env node
// Hook PreToolUse: Heimdall non modifica i test.
//
// Vale nei progetti seguiti da Heimdall, quelli con .heimdall/vincoli.md, per l'agente principale e per ogni subagente.
// Un file di test esistente (src/test/, *Test.java, *.spec.ts, …, risorse comprese) non si scrive, non si modifica,
// non si sposta e non si cancella. Un file di test nuovo si può creare: un test nuovo è il modo di verificare una correzione.
//
//   Edit, Write   il file_path
//   Bash          rm, mv, cp, sed -i, perl -i, truncate, tee, git rm, git mv, git checkout/restore e le redirezioni
//                 che toccano un test esistente, anche dentro bash -c "…"
//
// Un hook su Bash legge il comando, non lo esegue: uno script, un alias, find -delete gli sfuggono.
// È una rete per gli errori dell'agente, non un muro: il muro sono la review e la CI.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readEvent, deny, workingDir, heimdallRoot, isTestPath, simpleCommands, gitParts } = require("./common");

function who(event) {
  return event.agent_type ? `il subagente ${event.agent_type}` : "l'agente";
}

// Vero se `p` è un test esistente, oppure una cartella che contiene test (rm -r src/test).
function touchesTests(p, root) {
  if (!fs.existsSync(p)) return false;
  const rel = path.relative(root, p).replace(/\\/g, "/");
  if (rel.startsWith("..")) return false;
  if (isTestPath(rel)) return true;
  if (!fs.statSync(p).isDirectory()) return false;
  return containsTests(p, root, 0);
}

function containsTests(dir, root, depth) {
  if (depth > 6) return false;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules" || e.name === "target") continue;
    const p = path.join(dir, e.name);
    if (isTestPath(path.relative(root, p).replace(/\\/g, "/")) && fs.existsSync(p)) return true;
    if (e.isDirectory() && containsTests(p, root, depth + 1)) return true;
  }
  return false;
}

const REASON =
  "Heimdall non modifica i test: i test esistenti dicono se la correzione rompe qualcosa (vincolo «Test esistenti»). " +
  "Un test nuovo è un file nuovo. Se un test esistente va cambiato, fermati e dillo: lo decide una persona.";

// I percorsi che un comando semplice modifica, cancella o sposta.
function writtenPaths(cmd) {
  const { name, argv, redirects } = cmd;
  const args = argv.slice(1);
  const files = args.filter((a) => !a.startsWith("-"));
  const out = redirects.filter((r) => r.op === ">" || r.op === ">>").map((r) => r.target);
  switch (name) {
    case "rm":
    case "unlink":
    case "truncate":
    case "shred":
      return out.concat(files);
    case "mv":
      return out.concat(files); // la sorgente sparisce, la destinazione si sovrascrive
    case "cp":
    case "install":
      return out.concat(files.slice(-1));
    case "tee":
      return out.concat(files);
    case "sed":
    case "perl":
      return args.some((a) => /^-[a-zA-Z]*i/.test(a) || a.startsWith("--in-place")) ? out.concat(files.slice(1)) : out;
    case "git": {
      const { sub, args: rest } = gitParts(argv);
      const after = rest.filter((a) => !a.startsWith("-"));
      if (sub === "rm" || sub === "mv") return out.concat(after);
      if (sub === "checkout" || sub === "restore") {
        const dash = rest.indexOf("--");
        return out.concat(dash >= 0 ? rest.slice(dash + 1) : sub === "restore" ? after : []);
      }
      return out;
    }
    default:
      return out;
  }
}

readEvent((event) => {
  const tool = event.tool_name;
  const input = event.tool_input || {};
  const cwd = workingDir(event);

  if (tool === "Write" || tool === "Edit") {
    const file = input.file_path;
    if (!file) return;
    const abs = path.resolve(cwd, file);
    const root = heimdallRoot(abs);
    if (!root || !fs.existsSync(abs)) return; // progetto non seguito, oppure test nuovo
    if (isTestPath(path.relative(root, abs).replace(/\\/g, "/"))) {
      deny(`Bloccato: ${who(event)} vuole cambiare ${path.relative(root, abs)}, un test esistente. ${REASON}`);
    }
    return;
  }

  if (tool === "Bash" && typeof input.command === "string") {
    const root = heimdallRoot(cwd);
    if (!root) return;
    for (const cmd of simpleCommands(input.command)) {
      let base = cwd;
      if (cmd.name === "git" && gitParts(cmd.argv).dir) base = path.resolve(cwd, gitParts(cmd.argv).dir);
      for (const p of writtenPaths(cmd)) {
        const abs = path.resolve(base, p);
        if (touchesTests(abs, root)) {
          deny(`Bloccato: ${who(event)} vuole eseguire «${input.command.trim()}», che tocca ${path.relative(root, abs) || "."}, dove ci sono test esistenti. ${REASON}`);
        }
      }
    }
  }
});
