#!/usr/bin/env node
// Hook PreToolUse su Bash: Heimdall non fa merge. L'esito è sempre una pull request da rivedere.
//
// Vale nei progetti seguiti da Heimdall, quelli con .heimdall/vincoli.md, per l'agente principale e per ogni subagente.
// Blocca:
//   git merge                                    un merge, di qualsiasi branch
//   git commit, git push sul branch protetto     main, master, develop, release/*
//   git push --force, --mirror, --delete         riscrivere o cancellare la storia remota
//   gh pr merge, gh pr review --approve          chiudere o approvare una PR da soli
//   az repos pr update --status completed        completare una PR su Azure DevOps,
//     o --auto-complete true                     anche in automatico
//   az repos pr set-vote --vote approve          approvare una PR su Azure DevOps
//
// Un hook su Bash legge il comando, non lo esegue: uno script o un alias gli sfuggono. Il muro vero è sul server:
// le branch policy di Azure DevOps e un token di Heimdall che non ha il permesso di completare le PR.

"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { readEvent, deny, workingDir, heimdallRoot, simpleCommands, gitParts } = require("./common");

const PROTECTED = /^(main|master|develop|release\/.+)$/;
const REASON = "Heimdall non fa merge e non scrive sui branch protetti: l'esito è una pull request che rivede una persona.";

// Il comando come si scriverebbe: gli argomenti con spazi tra virgolette.
const show = (argv) => argv.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ");

function currentBranch(dir) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null; // non è un repo git: il comando fallirà da solo
  }
}

// Il branch remoto di un refspec: main, HEAD:main, feat:refs/heads/main, +x:main, :main.
function remoteBranch(refspec) {
  const dst = refspec.includes(":") ? refspec.split(":").pop() : refspec;
  return dst.replace(/^\+/, "").replace(/^refs\/heads\//, "");
}

function checkGit(cmd, cwd) {
  const { dir, sub, args } = gitParts(cmd.argv);
  const repo = dir ? path.resolve(cwd, dir) : cwd;
  const shown = show(cmd.argv);

  if (sub === "merge" && !args.some((a) => a === "--abort" || a === "--quit")) deny(`Bloccato «${shown}». ${REASON}`);
  if (sub === "commit") {
    const branch = currentBranch(repo);
    if (branch && PROTECTED.test(branch)) deny(`Bloccato «${shown}»: il branch corrente è ${branch}, che è protetto. Crea un branch per la correzione. ${REASON}`);
  }
  if (sub === "push") {
    if (args.some((a) => /^(-f|--force|--force-with-lease(=.*)?|--force-if-includes|--mirror|--delete|-d|--all)$/.test(a) || /^\+/.test(a))) {
      deny(`Bloccato «${shown}»: forzare, cancellare o spingere tutti i branch riscrive la storia remota. ${REASON}`);
    }
    const positional = args.filter((a) => !a.startsWith("-"));
    const refspecs = positional.slice(1); // il primo è il remote
    const targets = refspecs.length ? refspecs.map(remoteBranch) : [currentBranch(repo)];
    const hit = targets.find((b) => b && (PROTECTED.test(b) || (b === "HEAD" && PROTECTED.test(currentBranch(repo) || ""))));
    if (hit) deny(`Bloccato «${shown}»: spinge su ${hit === "HEAD" ? currentBranch(repo) : hit}, che è protetto. ${REASON}`);
  }
}

readEvent((event) => {
  if (event.tool_name !== "Bash") return;
  const command = (event.tool_input || {}).command;
  if (typeof command !== "string") return;
  const cwd = workingDir(event);
  if (!heimdallRoot(cwd)) return; // progetto non seguito da Heimdall

  for (const cmd of simpleCommands(command)) {
    const a = cmd.argv;
    const shown = show(a);
    if (cmd.name === "git") checkGit(cmd, cwd);
    if (cmd.name === "gh" && a[1] === "pr" && a[2] === "merge") deny(`Bloccato «${shown}». ${REASON}`);
    if (cmd.name === "gh" && a[1] === "pr" && a[2] === "review" && a.some((x) => x === "--approve" || x === "-a")) {
      deny(`Bloccato «${shown}»: chi ha scritto la correzione non la approva. ${REASON}`);
    }
    if (cmd.name === "az" && a[1] === "repos" && a[2] === "pr") {
      const value = (flag) => {
        const i = a.indexOf(flag);
        return i > 0 ? String(a[i + 1] || "").toLowerCase() : null;
      };
      if (a[3] === "update" && (value("--status") === "completed" || value("--auto-complete") === "true")) {
        deny(`Bloccato «${shown}»: completare una PR vuol dire farne il merge. ${REASON}`);
      }
      if (a[3] === "set-vote" && /^approve/.test(value("--vote") || "")) {
        deny(`Bloccato «${shown}»: chi ha scritto la correzione non la approva. ${REASON}`);
      }
    }
  }
});
