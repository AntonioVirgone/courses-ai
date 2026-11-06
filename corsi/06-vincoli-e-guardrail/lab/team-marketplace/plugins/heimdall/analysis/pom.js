// Il pom.xml di un progetto Maven: dipendenze dichiarate, proprietà e versione di Java, con le righe.
// Un lettore XML minimale, senza dipendenze: elementi, testo, commenti. Non risolve il pom padre
// né le dipendenze transitive: per quelle serve Maven (mvn dependency:tree).

"use strict";

// Dal testo a un albero di elementi { name, line, endLine, text, children }.
function parseXml(src) {
  const root = { name: "#root", line: 1, endLine: 1, text: "", children: [] };
  const stack = [root];
  let line = 1;
  let i = 0;
  const advance = (to) => {
    for (; i < to; i++) if (src[i] === "\n") line++;
  };
  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    const text = src.slice(i, lt);
    stack[stack.length - 1].text += text;
    advance(lt);
    if (src.startsWith("<!--", i)) { advance(src.indexOf("-->", i) + 3); continue; }
    if (src.startsWith("<?", i)) { advance(src.indexOf("?>", i) + 2); continue; }
    if (src.startsWith("<![CDATA[", i)) {
      const end = src.indexOf("]]>", i);
      stack[stack.length - 1].text += src.slice(i + 9, end);
      advance(end + 3);
      continue;
    }
    const gt = src.indexOf(">", i);
    const tag = src.slice(i + 1, gt);
    const at = line;
    advance(gt + 1);
    if (tag.startsWith("!")) continue; // <!DOCTYPE …>
    if (tag.startsWith("/")) {
      const el = stack.pop();
      el.endLine = line;
      continue;
    }
    const name = tag.replace(/\/$/, "").trim().split(/\s+/)[0];
    const el = { name, line: at, endLine: at, text: "", children: [] };
    stack[stack.length - 1].children.push(el);
    if (!tag.endsWith("/")) stack.push(el);
  }
  return root;
}

const child = (el, name) => (el ? el.children.find((c) => c.name === name) : undefined);
const value = (el, name) => {
  const c = child(el, name);
  return c ? c.text.trim() : null;
};

// «1.8» e «8» sono la stessa versione di Java
function javaMajor(v) {
  if (v === null || v === undefined) return null;
  const m = /^1\.(\d+)/.exec(String(v)) || /^(\d+)/.exec(String(v));
  return m ? Number(m[1]) : null;
}

function readPom(src, file = "pom.xml") {
  const project = child(parseXml(src), "project");
  if (!project) throw new Error(`${file} non ha l'elemento <project>.`);

  const props = {};
  const propLines = {};
  for (const p of (child(project, "properties") || { children: [] }).children) {
    props[p.name] = p.text.trim();
    propLines[p.name] = p.line;
  }
  props["project.version"] = value(project, "version");

  // ${nome} → il valore della proprietà, e la riga dove cambiarlo
  const resolve = (raw, line) => {
    if (raw === null) return { value: null, line: null, property: null };
    const m = /^\$\{([^}]+)\}$/.exec(raw);
    if (!m) return { value: raw, line, property: null };
    return { value: props[m[1]] ?? null, line: propLines[m[1]] ?? null, property: m[1] };
  };

  const dependencies = (child(project, "dependencies") || { children: [] }).children
    .filter((d) => d.name === "dependency")
    .map((d) => {
      const versionEl = child(d, "version");
      const version = resolve(versionEl ? versionEl.text.trim() : null, versionEl ? versionEl.line : null);
      return {
        name: `${value(d, "groupId")}:${value(d, "artifactId")}`,
        line: d.line,
        endLine: d.endLine,
        version: version.value,
        versionLine: version.line,
        versionProperty: version.property,
        scope: value(d, "scope") || "compile",
      };
    });

  // la versione di Java: release, poi source, poi la java.version di Spring Boot
  const javaKeys = ["maven.compiler.release", "maven.compiler.source", "java.version"];
  const javaKey = javaKeys.find((k) => props[k]);
  const parent = child(project, "parent");

  return {
    file,
    parent: parent ? `${value(parent, "groupId")}:${value(parent, "artifactId")}:${value(parent, "version")}` : null,
    java: javaKey ? props[javaKey] : null,
    javaAt: javaKey ? `${file}:${propLines[javaKey]}` : null,
    javaProperty: javaKey || null,
    dependencies,
  };
}

module.exports = { parseXml, readPom, javaMajor };
