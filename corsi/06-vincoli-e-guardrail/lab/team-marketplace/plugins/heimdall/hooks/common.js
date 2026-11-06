// Le parti comuni agli hook di Heimdall: leggere l'evento, negare, riconoscere i progetti seguiti e i file di test,
// dividere un comando di shell nei suoi comandi semplici.
//
// Gli hook leggono l'evento PreToolUse in JSON da stdin. Per bloccare escono con codice 2 e scrivono il motivo
// su stderr: Claude Code e Copilot CLI trattano entrambi l'uscita 2 di un PreToolUse come un diniego.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readEvent(handle) {
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
    handle(event || {});
    process.exit(0);
  });
}

function deny(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

// La cartella da cui parte il comando: il cwd dell'evento, altrimenti quello del processo.
function workingDir(event) {
  return event.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

// La radice del progetto seguito da Heimdall che contiene `start`: la prima cartella, salendo,
// che ha .heimdall/vincoli.md. Null se il progetto non è seguito: lì gli hook non intervengono.
function heimdallRoot(start) {
  let dir = path.resolve(start);
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".heimdall", "vincoli.md"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// I nomi dei vincoli: il testo in grassetto all'inizio di ogni voce numerata, senza il punto finale.
function constraintNames(root) {
  const file = path.join(root, ".heimdall", "vincoli.md");
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim().replace(/\.$/, ""));
}

// Un file di test, per le convenzioni dei tre scenari: Maven e Gradle, JUnit, Angular e Jest.
// Le risorse di test contano come test: cambiarle cambia quello che il test verifica.
const TEST_PATTERNS = [
  /(^|\/)src\/test(\/|$)/,
  /(^|\/)__tests__(\/|$)/,
  /\.(spec|test)\.[cm]?[jt]sx?$/,
  /(Test|Tests|IT)\.java$/,
];

function isTestPath(file) {
  const p = file.replace(/\\/g, "/");
  return TEST_PATTERNS.some((re) => re.test(p));
}

// ---- comandi di shell

// Divide una riga di shell in comandi semplici: { argv, redirects }. Gestisce virgolette, escape,
// gli operatori && || ; | & e le redirezioni > >> <. Non espande variabili né sostituzioni: le lascia come testo.
function splitShell(line) {
  const commands = [];
  let argv = [];
  let redirects = [];
  let word = null; // la parola in corso, oppure null
  let redirect = null; // l'operatore di redirezione che aspetta il suo file

  const endWord = () => {
    if (word === null) return;
    if (redirect) redirects.push({ op: redirect, target: word });
    else argv.push(word);
    word = null;
    redirect = null;
  };
  const endCommand = () => {
    endWord();
    if (argv.length || redirects.length) commands.push({ argv, redirects });
    argv = [];
    redirects = [];
  };

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const rest = line.slice(i);
    if (/^(&&|\|\||;|\||\n)/.test(rest)) {
      endCommand();
      if (rest.startsWith("&&") || rest.startsWith("||")) i++;
      continue;
    }
    const r = /^(\d*|&)(>>|>|<)(&\d+|&-)?/.exec(rest);
    if (r && (r[1] === "" || word === null)) {
      if (word !== null && /^\d+$/.test(word)) word = null; // 2>file: il 2 è il descrittore, non un argomento
      endWord();
      i += r[0].length - 1;
      if (!r[3]) redirect = r[2]; // 2>&1 non ha un file
      continue;
    }
    if (c === "&") {
      endCommand();
      continue;
    }
    if (c === " " || c === "\t") {
      endWord();
      continue;
    }
    if (word === null) word = "";
    if (c === "'") {
      const close = line.indexOf("'", i + 1);
      const stop = close < 0 ? line.length : close;
      word += line.slice(i + 1, stop);
      i = stop;
    } else if (c === '"') {
      let j = i + 1;
      for (; j < line.length && line[j] !== '"'; j++) word += line[j] === "\\" && j + 1 < line.length ? line[++j] : line[j];
      i = j;
    } else if (c === "\\" && i + 1 < line.length) {
      word += line[++i];
    } else {
      word += c;
    }
  }
  endCommand();
  return commands;
}

const WRAPPERS = new Set(["sudo", "env", "command", "time", "nice", "nohup", "exec", "xargs"]);

// I comandi semplici di una riga, con le assegnazioni iniziali e i comandi involucro tolti.
// `bash -c "…"` e `sh -c "…"` si aprono: il loro testo è un'altra riga di shell.
function simpleCommands(line, depth = 0) {
  const out = [];
  for (const cmd of splitShell(line)) {
    let argv = cmd.argv;
    for (;;) {
      while (argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) argv = argv.slice(1);
      if (argv.length && WRAPPERS.has(path.basename(argv[0]))) {
        argv = argv.slice(1);
        while (argv.length && argv[0].startsWith("-")) argv = argv.slice(1);
        continue;
      }
      break;
    }
    const name = argv.length ? path.basename(argv[0]) : "";
    if ((name === "bash" || name === "sh" || name === "zsh") && argv[1] === "-c" && argv[2] && depth < 3) {
      out.push(...simpleCommands(argv[2], depth + 1));
      continue;
    }
    out.push({ argv, name, redirects: cmd.redirects });
  }
  return out;
}

// Un comando git diviso in opzioni globali, sottocomando e argomenti: git -C dir -c k=v push origin main.
function gitParts(argv) {
  let dir = null;
  let i = 1;
  while (i < argv.length && argv[i].startsWith("-")) {
    if (argv[i] === "-C") dir = argv[++i];
    else if (argv[i] === "-c") i++;
    i++;
  }
  return { dir, sub: argv[i] || "", args: argv.slice(i + 1) };
}

module.exports = { readEvent, deny, workingDir, heimdallRoot, constraintNames, isTestPath, simpleCommands, gitParts };
