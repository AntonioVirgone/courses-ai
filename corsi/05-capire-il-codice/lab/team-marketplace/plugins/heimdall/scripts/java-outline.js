#!/usr/bin/env node
// L'albero di un file Java come lo vede l'analisi di Heimdall: tipi, metodi, chiamate e dove portano.
// Serve per confrontare quello che trova grep con quello che trova un parser.
//
//   node scripts/java-outline.js <file.java>     dalla radice del progetto Maven

"use strict";

const path = require("node:path");
const { loadProject, resolveCall, entryOf, methodId, short } = require("../analysis");

function main() {
  const [file] = process.argv.slice(2);
  if (!file) {
    console.error("Uso: node scripts/java-outline.js <file.java>, dalla radice del progetto");
    process.exit(2);
  }
  const root = process.cwd();
  const rel = path.relative(root, path.resolve(file)).split(path.sep).join("/");
  const project = loadProject(root);
  const unit = project.units.find((u) => u.file === rel);
  if (!unit) {
    console.error(`${rel} non è tra i file di src/main/java e src/test/java.`);
    process.exit(1);
  }

  console.log(`${unit.file}${unit.test ? " (test)" : ""}`);
  console.log(`package ${unit.package || "—"}`);
  for (const imp of unit.imports) console.log(`  import ${imp.static ? "static " : ""}${imp.name}${imp.wildcard ? ".*" : ""}  · riga ${imp.line}`);

  for (const type of unit.types) {
    const ann = type.annotations.map((a) => `@${a.name}`).join(" ");
    const supers = type.supers.length ? ` : ${type.supers.join(", ")}` : "";
    console.log(`\n${type.kind} ${type.name}${supers}  ${ann}  · riga ${type.line}`);
    for (const [name, t] of Object.entries(type.fields)) console.log(`  campo ${name}: ${t}`);
    for (const method of type.methods) {
      if (method.synthetic && !method.calls.length) continue;
      const params = method.params.map((p) => `${p.type} ${p.name}`).join(", ");
      const entry = entryOf(type, method);
      const head = method.synthetic ? "inizializzazione dei campi" : `${method.name}(${params})  · righe ${method.line}–${method.endLine}`;
      console.log(`  ${head}${method.annotations.length ? "  " + method.annotations.map((a) => `@${a.name}`).join(" ") : ""}${entry ? `  ◀ ingresso: ${entry.label}` : ""}`);
      for (const call of method.calls) {
        const { target, found } = resolveCall(project, type, method, call);
        const shown = call.kind === "new" ? `new ${call.receiverType}()` : `${call.receiver ? call.receiver + "." : call.receiver === null ? "?." : ""}${call.name}()`;
        const where = found.length
          ? `progetto: ${[...new Set(found.map((f) => short(methodId(f.type, f.method))))].join(", ")}`
          : target.type || "tipo non risolto";
        console.log(`    ${String(call.line).padStart(4)}  ${shown.padEnd(34)} → ${where}`);
      }
    }
  }
  const comments = new Set(unit.comments.map((c) => c.line)).size;
  console.log(`\nfuori dall'albero: ${comments} righe di commento, ${unit.strings.length} stringhe`);
}

main();
