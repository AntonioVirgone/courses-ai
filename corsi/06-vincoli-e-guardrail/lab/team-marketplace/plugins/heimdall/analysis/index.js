// L'analisi statica di un progetto Java per un alert: i fatti che servono al Security Analyst.
//
//   indice      ogni file Java di src/main/java e src/test/java, con l'albero di java.js
//   risoluzione i nomi semplici diventano nomi completi, con gli import e il package
//   grafo       chi chiama chi, tra i metodi del progetto
//   ingressi    i metodi da cui parte l'esecuzione: endpoint HTTP, filtri, avvio, main; e i test
//   catene      dal punto d'ingresso al codice dell'alert, passo per passo, con file e riga
//
// Il programma misura, l'agente giudica: qui non si decide se un alert è pertinente.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseJava, simple } = require("./java");
const { readPom, javaMajor } = require("./pom");

const SOURCE_DIRS = [
  { dir: "src/main/java", test: false },
  { dir: "src/test/java", test: true },
];
const JAVA_LANG = new Set([
  "Object", "String", "StringBuilder", "Integer", "Long", "Short", "Byte", "Double", "Float", "Boolean", "Character",
  "Math", "System", "Thread", "Runnable", "Iterable", "Class", "Enum", "Exception", "RuntimeException", "Error",
  "Throwable", "IllegalArgumentException", "IllegalStateException", "NullPointerException", "UnsupportedOperationException",
]);
const HTTP = { GetMapping: "GET", PostMapping: "POST", PutMapping: "PUT", DeleteMapping: "DELETE", PatchMapping: "PATCH", RequestMapping: null };
const FILTERS = new Set(["Filter", "OncePerRequestFilter", "GenericFilterBean"]);
const TESTS = new Set(["Test", "ParameterizedTest", "RepeatedTest"]);

const short = (id) => id.replace(/^.*\.([^.#]+#)/, "$1"); // com.acme.x.Tipo#metodo → Tipo#metodo
const shortType = (fqn) => (fqn ? simple(fqn) : "?");

function javaFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return javaFiles(p);
    return e.name.endsWith(".java") ? [p] : [];
  });
}

// ---- indice e risoluzione

function loadProject(root, { libraryPackages = [] } = {}) {
  const units = [];
  for (const { dir, test } of SOURCE_DIRS) {
    for (const file of javaFiles(path.join(root, dir)).sort()) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      const unit = parseJava(fs.readFileSync(file, "utf8"), rel);
      unit.test = test;
      units.push(unit);
    }
  }
  const types = new Map();
  for (const unit of units) for (const t of unit.types) types.set(t.fqn, Object.assign(t, { unit }));

  const isLibrary = (fqn) => Boolean(fqn) && libraryPackages.some((p) => fqn.startsWith(p + "."));
  const project = { root, units, types, isLibrary };
  for (const unit of units) unit.resolve = resolver(project, unit);
  for (const t of types.values()) t.superFqns = t.supers.map((s) => t.unit.resolve(s, t)).filter(Boolean);
  return project;
}

function resolver(project, unit) {
  const explicit = new Map();
  const wildcards = [];
  for (const imp of unit.imports) {
    if (imp.static) continue;
    if (imp.wildcard) wildcards.push(imp.name);
    else explicit.set(simple(imp.name), imp.name);
  }
  // Un nome semplice o qualificato → il nome completo del tipo, oppure null se non si sa
  return function resolve(name, fromType) {
    if (!name) return null;
    if (name.endsWith(".class")) return "java.lang.Class";
    if (name.includes(".")) {
      const [first, ...rest] = name.split(".");
      if (/^[a-z]/.test(first)) return name; // già qualificato: java.io.File
      const head = resolve(first, fromType);
      return head ? `${head}.${rest.join(".")}` : null;
    }
    for (let t = fromType; t; t = project.types.get(t.outer)) {
      if (t.name === name) return t.fqn;
      if (project.types.has(`${t.fqn}.${name}`)) return `${t.fqn}.${name}`;
    }
    if (explicit.has(name)) return explicit.get(name);
    const same = unit.package ? `${unit.package}.${name}` : name;
    if (project.types.has(same)) return same;
    for (const w of wildcards) if (project.types.has(`${w}.${name}`)) return `${w}.${name}`;
    for (const w of wildcards) if (project.isLibrary(`${w}.${name}`)) return `${w}.${name}`;
    if (JAVA_LANG.has(name)) return `java.lang.${name}`;
    return null;
  };
}

// Il tipo di una variabile visibile nel metodo: locale, parametro, campo del tipo o dei tipi esterni.
function variableType(project, type, method, name) {
  if (method.locals[name]) return method.locals[name];
  const param = method.params.find((p) => p.name === name);
  if (param) return param.type;
  for (let t = type; t; t = project.types.get(t.outer)) if (t.fields[name]) return t.fields[name];
  return null;
}

// La chiamata → { type: nome completo o null, name }
function callTarget(project, type, method, call) {
  const resolve = (n) => type.unit.resolve(n, type);
  if (call.kind === "new") return { type: resolve(call.receiverType), name: "<init>" };
  if (call.receiver === null) return { type: null, name: call.name };
  if (call.receiver === "") return { type: type.fqn, name: call.name, unqualified: true };
  const parts = call.receiver.split(".");
  if (parts[0] === "this" && parts.length === 2) return { type: resolve(variableType(project, type, method, parts[1])), name: call.name };
  if (parts[0] === "super" && parts.length === 1) return { type: type.superFqns[0] || null, name: call.name };
  const varType = variableType(project, type, method, parts[0]);
  if (varType) return { type: parts.length === 1 ? resolve(varType) : null, name: call.name };
  if (call.receiver.endsWith(".class")) return { type: "java.lang.Class", name: call.name };
  return { type: resolve(call.receiver), name: call.name, static: true };
}

// I metodi del progetto che una chiamata può eseguire: il metodo del tipo (o ereditato),
// e quelli che lo ridefiniscono nei sottotipi. Gli overload non si distinguono.
function findMethods(project, fqn, name, seen = new Set()) {
  const t = project.types.get(fqn);
  if (!t || seen.has(fqn)) return [];
  seen.add(fqn);
  const wanted = name === "<init>" ? t.name : name;
  const own = t.methods.filter((m) => m.name === wanted);
  if (own.length) return own.map((m) => ({ type: t, method: m }));
  for (const s of t.superFqns) {
    const found = findMethods(project, s, name, seen);
    if (found.length) return found;
  }
  return [];
}

function subtypes(project, fqn) {
  const out = [];
  for (const t of project.types.values()) if (t.superFqns.includes(fqn)) out.push(t, ...subtypes(project, t.fqn));
  return out;
}

const methodId = (type, method) => `${type.fqn}#${method.name}`;

// Una chiamata → il tipo che riceve e i metodi del progetto che può eseguire
function resolveCall(project, type, method, call) {
  const target = callTarget(project, type, method, call);
  let found = [];
  if (target.unqualified) {
    for (let t = type; t && !found.length; t = project.types.get(t.outer)) found = findMethods(project, t.fqn, target.name);
    if (!found.length) {
      // import static a.b.Tipo.metodo (o a.b.Tipo.*): il metodo è di Tipo
      const imp = type.unit.imports.find((x) => x.static && (x.wildcard || x.name.endsWith("." + target.name)));
      if (imp) {
        target.type = imp.wildcard ? imp.name : imp.name.slice(0, imp.name.lastIndexOf("."));
        if (project.types.has(target.type)) found = findMethods(project, target.type, target.name);
      }
    }
  } else if (target.type && project.types.has(target.type)) {
    found = findMethods(project, target.type, target.name);
    if (target.name !== "<init>") {
      for (const sub of subtypes(project, target.type)) found.push(...sub.methods.filter((m) => m.name === target.name).map((m) => ({ type: sub, method: m })));
    }
  }
  return { target, found };
}

// ---- grafo delle chiamate

function buildGraph(project) {
  const nodes = new Map(); // id → { type, method }
  const calls = []; // { from, to, line, file } verso metodi del progetto
  const external = []; // { from, type, name, line, file } verso tipi fuori dal progetto

  for (const type of project.types.values()) for (const method of type.methods) nodes.set(methodId(type, method), { type, method });

  for (const { type, method } of nodes.values()) {
    const from = methodId(type, method);
    for (const call of method.calls) {
      const { target, found } = resolveCall(project, type, method, call);
      if (found.length) {
        for (const f of found) calls.push({ from, to: methodId(f.type, f.method), line: call.line, file: type.unit.file });
      } else {
        external.push({ from, type: target.type, name: target.name, line: call.line, file: type.unit.file, receiver: call.receiver });
      }
    }
  }
  return { nodes, calls, external };
}

// ---- punti d'ingresso

function joinRoute(base, sub) {
  const p = `/${[base, sub].filter(Boolean).join("/")}`.replace(/\/+/g, "/");
  return p.length > 1 ? p.replace(/\/$/, "") : p;
}

function entryOf(type, method) {
  const has = (name) => method.annotations.some((a) => a.name === name);
  if (type.unit.test) return method.annotations.some((a) => TESTS.has(a.name)) ? { kind: "test", label: "test" } : null;
  const mapping = method.annotations.find((a) => a.name in HTTP);
  if (mapping) {
    const base = (type.annotations.find((a) => a.name === "RequestMapping") || { values: [] }).values[0] || "";
    const k = mapping.ids.indexOf("RequestMethod");
    const verb = HTTP[mapping.name] || (k >= 0 ? mapping.ids[k + 1] : "ANY");
    return { kind: "http", label: `${verb} ${joinRoute(base, mapping.values[0] || "")}` };
  }
  if (["doFilter", "doFilterInternal"].includes(method.name) && type.supers.some((s) => FILTERS.has(simple(s)))) {
    return { kind: "filter", label: "ogni richiesta HTTP (filtro)" };
  }
  if (has("PostConstruct")) return { kind: "startup", label: "all'avvio (@PostConstruct)" };
  if (has("EventListener")) return { kind: "event", label: "evento (@EventListener)" };
  if (has("Scheduled")) return { kind: "scheduled", label: "pianificato (@Scheduled)" };
  if (method.name === "main" && method.isStatic) return { kind: "main", label: "main" };
  return null;
}

// ---- catene: dagli ingressi ai metodi bersaglio, all'indietro sul grafo

function chains(project, graph, targets) {
  // targets: Map id → { at } la riga del bersaglio dentro il metodo
  const callers = new Map();
  for (const c of graph.calls) {
    if (!callers.has(c.to)) callers.set(c.to, []);
    callers.get(c.to).push(c);
  }
  const next = new Map(); // metodo → { to, line, file }: il passo successivo verso un bersaglio
  const queue = [...targets.keys()];
  const seen = new Set(queue);
  while (queue.length) {
    const id = queue.shift();
    for (const c of callers.get(id) || []) {
      if (seen.has(c.from)) continue;
      seen.add(c.from);
      next.set(c.from, c);
      queue.push(c.from);
    }
  }
  const out = [];
  for (const id of seen) {
    const { type, method } = graph.nodes.get(id);
    const entry = entryOf(type, method);
    if (!entry) continue;
    const steps = [];
    let cur = id;
    while (next.has(cur)) {
      const c = next.get(cur);
      steps.push({ method: cur, at: `${c.file}:${c.line}` });
      cur = c.to;
    }
    steps.push({ method: cur, at: targets.get(cur).at });
    out.push({ entry: { kind: entry.kind, label: entry.label, method: id, at: `${type.unit.file}:${method.line}` }, steps });
  }
  const order = { http: 0, filter: 1, event: 2, scheduled: 3, startup: 4, main: 5, test: 6 };
  out.sort((a, b) => order[a.entry.kind] - order[b.entry.kind] || a.entry.method.localeCompare(b.entry.method));
  return out;
}

// ---- grep e albero: che cosa trova il testo, che cosa trova il codice

function textVersusCode(project, terms) {
  const result = { terms, lines: 0, code: 0, textOnly: [] };
  if (!terms.length) return result;
  const re = new RegExp(terms.join("|"));
  for (const unit of project.units.filter((u) => !u.test)) {
    const lines = fs.readFileSync(path.join(project.root, unit.file), "utf8").split("\n");
    lines.forEach((text, k) => {
      const line = k + 1;
      if (!re.test(text)) return;
      result.lines++;
      const inCode = terms.some((t) => (unit.idLines.get(t) || new Set()).has(line));
      if (inCode) { result.code++; return; }
      const why = unit.comments.some((c) => c.line === line && re.test(c.text)) ? "commento" : "stringa";
      result.textOnly.push({ at: `${unit.file}:${line}`, why, text: text.trim() });
    });
  }
  return result;
}

// ---- versioni

function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  const pb = String(b).split(/[.-]/).map((x) => (/^\d+$/.test(x) ? Number(x) : x));
  for (let k = 0; k < Math.max(pa.length, pb.length); k++) {
    const x = pa[k] ?? 0;
    const y = pb[k] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x).localeCompare(String(y));
  }
  return 0;
}

// ---- l'analisi di un alert

function where(file, line) {
  return line ? `${file}:${line}` : file;
}

function enclosing(project, file, line) {
  const unit = project.units.find((u) => u.file === file);
  if (!unit) return null;
  for (const t of unit.types) {
    for (const m of t.methods) if (!m.synthetic && line >= m.line && line <= m.endLine) return { type: t, method: m };
  }
  return null;
}

function analyzeAlert(root, alert, { component = null, tool = {} } = {}) {
  const pomFile = path.join(root, "pom.xml");
  const pom = fs.existsSync(pomFile) ? readPom(fs.readFileSync(pomFile, "utf8")) : null;
  const packages = component ? component.packages || [] : [];
  const project = loadProject(root, { libraryPackages: packages });
  const graph = buildGraph(project);

  const main = project.units.filter((u) => !u.test);
  const entries = [...graph.nodes.values()].filter(({ type, method }) => !type.unit.test && entryOf(type, method));
  const analysis = {
    alert: alert.id,
    project: alert.project,
    kind: alert.kind,
    tool,
    build: pom
      ? { tool: "maven", file: "pom.xml", parent: pom.parent, java: pom.java, javaAt: pom.javaAt }
      : { tool: null, note: "Manca pom.xml: dipendenze e versione di Java non lette." },
    index: {
      mainFiles: main.length,
      testFiles: project.units.length - main.length,
      types: [...project.types.values()].filter((t) => !t.unit.test).length,
      methods: [...graph.nodes.values()].filter((n) => !n.type.unit.test && !n.method.synthetic).length,
      calls: graph.calls.length + graph.external.length,
      entryPoints: entries.map(({ type, method }) => ({ ...entryOf(type, method), method: methodId(type, method), at: `${type.unit.file}:${method.line}` })),
    },
  };
  if (!main.length) analysis.index.note = "Nessun file in src/main/java: l'analisi del codice non è disponibile.";

  const targets = new Map();
  const addTarget = (id, at) => { if (!targets.has(id)) targets.set(id, { at }); };

  if (alert.kind === "dependency") {
    const dep = pom ? pom.dependencies.find((d) => d.name === alert.component.name) : null;
    const java = pom ? javaMajor(pom.java) : null;
    const versions = component ? [...component.versions].sort((a, b) => compareVersions(a.version, b.version)) : [];
    const meta = (v) => versions.find((x) => x.version === v) || null;
    const fixedIn = alert.component.fixedIn ? meta(alert.component.fixedIn) : null;
    const compatible = alert.component.fixedIn
      ? versions.filter((v) => compareVersions(v.version, alert.component.fixedIn) >= 0 && (java === null || Number(v.javaMin) <= java)).map((v) => v.version)
      : [];

    const usages = graph.external
      .filter((x) => project.isLibrary(x.type))
      .map((x) => ({ at: `${x.file}:${x.line}`, in: x.from, api: `${x.type}.${x.name === "<init>" ? "new" : x.name}` }));
    const mainUsages = usages.filter((u) => !graph.nodes.get(u.in).type.unit.test);
    for (const u of mainUsages) addTarget(u.in, u.at);
    // una chiamata in catena (a.b().c()) non ha un tipo: la segnaliamo, perché un parser minimale non la risolve
    const untyped = graph.external
      .filter((x) => x.receiver === null && targets.has(x.from))
      .map((x) => ({ at: `${x.file}:${x.line}`, in: x.from, call: `?.${x.name}` }));

    analysis.dependency = {
      name: alert.component.name,
      declared: dep
        ? {
            at: `pom.xml:${dep.line}-${dep.endLine}`,
            alertLineInside: alert.location.line ? alert.location.line >= dep.line && alert.location.line <= dep.endLine : null,
            version: dep.version,
            versionAt: dep.versionLine ? `pom.xml:${dep.versionLine}` : null,
            versionProperty: dep.versionProperty,
            scope: dep.scope,
            direct: true,
          }
        : { note: "Non è tra le dipendenze dirette del pom.xml: può arrivare come transitiva, controlla con mvn dependency:tree." },
      packages,
      versions, // tutte, dalla più vecchia: le note di una versione intermedia possono contare
      current: meta(alert.component.version),
      fixedIn,
      compatibleFixes: compatible,
      javaUpgrade: fixedIn && java !== null && Number(fixedIn.javaMin) > java ? { from: pom.java, to: fixedIn.javaMin, at: pom.javaAt } : null,
      metadata: component ? "get_component" : "nessun metadato dal server MCP",
    };
    analysis.usages = {
      imports: main.flatMap((u) => u.imports.filter((imp) => project.isLibrary(imp.name)).map((imp) => ({ at: `${u.file}:${imp.line}`, name: imp.name }))),
      calls: mainUsages,
      untyped,
      inTests: usages.filter((u) => graph.nodes.get(u.in).type.unit.test),
    };
    analysis.upgradeImpact = ((fixedIn && fixedIn.breaking) || []).map((b) => ({
      ...b,
      usedAt: b.api ? mainUsages.filter((u) => u.api === b.api || u.api.startsWith(b.api + ".")).map((u) => u.at) : [],
    }));
    analysis.grep = textVersusCode(project, [...new Set(analysis.usages.imports.map((imp) => simple(imp.name)))]);
  } else {
    const found = enclosing(project, alert.location.file, alert.location.line);
    const lines = fs.existsSync(path.join(root, alert.location.file)) ? fs.readFileSync(path.join(root, alert.location.file), "utf8").split("\n") : null;
    analysis.location = {
      at: where(alert.location.file, alert.location.line),
      exists: Boolean(lines),
      text: lines && alert.location.line ? (lines[alert.location.line - 1] || "").trim() : null,
      in: found ? methodId(found.type, found.method) : null,
    };
    if (found) addTarget(methodId(found.type, found.method), analysis.location.at);
  }

  const all = chains(project, graph, targets);
  analysis.reachability = all.filter((c) => c.entry.kind !== "test");
  analysis.tests = all.filter((c) => c.entry.kind === "test").map((c) => ({ test: c.entry.method, at: c.entry.at, reaches: c.steps[c.steps.length - 1].method }));
  // in avanti dagli ingressi (non i test): un bersaglio che nessun ingresso raggiunge
  const reached = new Set(entries.map(({ type, method }) => methodId(type, method)));
  const queue = [...reached];
  while (queue.length) {
    const id = queue.shift();
    for (const c of graph.calls) if (c.from === id && !reached.has(c.to)) { reached.add(c.to); queue.push(c.to); }
  }
  analysis.unreached = [...targets.keys()].filter((id) => !reached.has(id));
  return analysis;
}

module.exports = { analyzeAlert, loadProject, buildGraph, resolveCall, entryOf, methodId, short, shortType, compareVersions };
