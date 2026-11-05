// Un parser Java minimale, senza dipendenze: dal testo a un albero di dichiarazioni.
//
//   file ─ package, import
//        └ tipi (class, interface, enum, record) ─ annotazioni, extends/implements, campi
//            └ metodi ─ annotazioni, parametri, variabili locali
//                └ chiamate (a.b(), new T(), T::m), con la riga
//
// Non è un compilatore: non risolve i tipi di ritorno, i generici e gli overload.
// Basta per sapere chi chiama chi, dove, e che cosa è codice e che cosa è testo:
// commenti e stringhe sono token a parte, e un nome dentro un commento non è un uso.

"use strict";

const KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue",
  "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "goto", "if",
  "implements", "import", "instanceof", "int", "interface", "long", "native", "new", "package", "private",
  "protected", "public", "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this",
  "throw", "throws", "transient", "try", "void", "volatile", "while", "var", "yield", "record",
  "true", "false", "null",
]);
// Dopo queste parole un «nome(» è una chiamata, non la dichiarazione di un metodo.
const BEFORE_CALL = new Set(["return", "throw", "new", "else", "case", "yield", "assert", "do"]);
const TYPE_KEYWORDS = new Set(["class", "interface", "enum", "record"]);

// ---- token

function tokenize(src) {
  const tokens = [];
  const comments = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  const push = (type, value, at) => tokens.push({ type, value, line: at });

  while (i < n) {
    const c = src[i];
    if (c === "\n") { line++; i++; continue; }
    if (c === " " || c === "\t" || c === "\r" || c === "\f") { i++; continue; }

    if (c === "/" && src[i + 1] === "/") {
      const start = i;
      while (i < n && src[i] !== "\n") i++;
      comments.push({ line, text: src.slice(start, i) });
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const start = i;
      const from = line;
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { if (src[i] === "\n") line++; i++; }
      i += 2;
      src.slice(start, i).split("\n").forEach((text, k) => comments.push({ line: from + k, text }));
      continue;
    }
    if (c === '"' || c === "'") {
      const from = line;
      const block = c === '"' && src.startsWith('"""', i); // blocchi di testo, Java 15+
      const close = block ? '"""' : c;
      let j = i + close.length;
      while (j < n && !src.startsWith(close, j)) {
        if (src[j] === "\\") j++;
        if (src[j] === "\n") line++;
        j++;
      }
      push(c === '"' ? "str" : "char", src.slice(i + close.length, j), from);
      i = j + close.length;
      continue;
    }
    if (/[\p{L}_$]/u.test(c)) {
      let j = i + 1;
      while (j < n && /[\p{L}\p{N}_$]/u.test(src[j])) j++;
      push("id", src.slice(i, j), line);
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_.]/.test(src[j])) j++;
      push("num", src.slice(i, j), line);
      i = j;
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (three === "...") { push("p", three, line); i += 3; continue; }
    if (two === "::" || two === "->") { push("p", two, line); i += 2; continue; }
    push("p", c, line); // «>>» resta come due «>»: così i generici annidati si chiudono da soli
    i++;
  }
  return { tokens, comments };
}

// ---- albero

const isP = (t, v) => Boolean(t) && t.type === "p" && t.value === v;
const isId = (t, v) => Boolean(t) && t.type === "id" && (v === undefined || t.value === v);
const isName = (t) => isId(t) && !KEYWORDS.has(t.value);
const simple = (name) => name.replace(/<.*$/, "").split(".").pop();

function parseJava(src, file) {
  const { tokens, comments } = tokenize(src);
  const unit = { file, package: "", imports: [], types: [], comments, strings: [], idLines: new Map() };
  for (const t of tokens) {
    if (t.type === "str") unit.strings.push({ line: t.line, text: t.value });
    if (t.type === "id") {
      if (!unit.idLines.has(t.value)) unit.idLines.set(t.value, new Set());
      unit.idLines.get(t.value).add(t.line);
    }
  }

  let i = 0;
  const peek = (k = 0) => tokens[i + k];

  // da tokens[i] == open alla chiusura corrispondente; restituisce l'indice dopo la chiusura
  function matchEnd(from, open, close) {
    let depth = 0;
    for (let j = from; j < tokens.length; j++) {
      if (isP(tokens[j], open)) depth++;
      else if (isP(tokens[j], close) && --depth === 0) return j + 1;
    }
    return tokens.length;
  }

  function qualifiedName() {
    let name = tokens[i].value;
    i++;
    while (isP(peek(), ".") && isId(peek(1))) { name += "." + tokens[i + 1].value; i += 2; }
    return name;
  }

  // @Nome o @Nome(argomenti): restituisce il nome semplice e i valori di value/path o posizionali
  function annotation() {
    const line = tokens[i].line;
    i++;
    const name = qualifiedName();
    const values = [];
    const ids = [];
    if (isP(peek(), "(")) {
      const end = matchEnd(i, "(", ")");
      for (let j = i + 1; j < end - 1; j++) {
        const t = tokens[j];
        if (t.type === "id") ids.push(t.value);
        if (t.type !== "str") continue;
        const named = isP(tokens[j - 1], "=") ? tokens[j - 2].value : null;
        const inArray = isP(tokens[j - 1], "{") || isP(tokens[j - 1], ",");
        const key = named || (inArray && isP(tokens[j - 2], "=") ? tokens[j - 3].value : null);
        if (key === null || key === "value" || key === "path") values.push(t.value);
      }
      i = end;
    }
    return { name: simple(name), line, values, ids };
  }

  const isTypeStart = () =>
    (isId(peek()) && TYPE_KEYWORDS.has(peek().value) && isId(peek(1)) && !isP(tokens[i - 1], ".") &&
      !(peek().value === "record" && !isP(peek(2), "(") && !isP(peek(2), "<"))) ||
    (isP(peek(), "@") && isId(peek(1), "interface"));

  // Parametri tra parentesi: [{ name, type }]
  function params(from, to) {
    const list = [];
    let part = [];
    let angle = 0;
    const flush = () => {
      const ids = part.filter((t) => t.type === "id" && !["final"].includes(t.value));
      if (ids.length >= 2) list.push({ name: ids[ids.length - 1].value, type: ids.slice(0, -1).map((t) => t.value).join(".").replace(/\.\.+/g, ".") });
      part = [];
    };
    for (let j = from; j < to; j++) {
      const t = tokens[j];
      if (isP(t, "@")) { // annotazione sul parametro, con gli argomenti
        j++;
        while (isP(tokens[j + 1], ".") && isId(tokens[j + 2])) j += 2;
        if (isP(tokens[j + 1], "(")) j = matchEnd(j + 1, "(", ")") - 1;
        continue;
      }
      if (isP(t, "<")) { angle++; continue; }
      if (isP(t, ">")) { angle--; continue; }
      if (angle > 0) continue; // i generici non servono: Map<String, Integer> è Map
      if (isP(t, ",")) { flush(); continue; }
      if (isP(t, ".") || isP(t, "[") || isP(t, "]") || isP(t, "...")) continue;
      part.push(t);
    }
    flush();
    // il tipo di un parametro qualificato (java.io.InputStream in) è il nome con i punti
    return list.map((p) => ({ name: p.name, type: p.type.split(".").filter(Boolean).join(".") }));
  }

  // Il corpo di un metodo, o un inizializzatore: variabili locali e chiamate.
  function scanBody(from, to, method, type) {
    for (let j = from; j < to; j++) {
      const t = tokens[j];
      const prev = tokens[j - 1];

      // variabile locale: Tipo nome =|;|:|,|)   (anche Tipo<...>, Tipo[], a.b.Tipo)
      // (non saltiamo i token della dichiarazione: l'inizializzatore può contenere chiamate)
      if (isName(t) && !isP(prev, ".")) {
        const decl = localDecl(j, to);
        if (decl) method.locals[decl.name] = decl.type;
      }

      if (isId(t, "new")) {
        let k = j + 1;
        if (!isId(tokens[k])) continue;
        let name = tokens[k].value;
        while (isP(tokens[k + 1], ".") && isId(tokens[k + 2])) { name += "." + tokens[k + 2].value; k += 2; }
        k++;
        if (isP(tokens[k], "<")) k = matchEnd(k, "<", ">");
        if (isP(tokens[k], "(")) method.calls.push({ kind: "new", receiverType: name, name: "<init>", line: tokens[j].line });
        continue;
      }

      if (isP(t, "::") && isName(tokens[j + 1])) {
        const recv = prev;
        if (isId(recv)) method.calls.push({ kind: "ref", receiver: recv.value, name: tokens[j + 1].value, line: t.line });
        continue;
      }

      if (!isId(t) || !isP(tokens[j + 1], "(")) continue;
      if (KEYWORDS.has(t.value) || isId(prev, "new")) continue; // if (, for (, this(, super(, new Tipo(…
      if (isP(prev, ".")) {
        // a.b.c.m(  →  il ricevitore è la catena di nomi prima di «.m»
        const chain = [];
        let k = j - 1;
        while (isP(tokens[k], ".") && isId(tokens[k - 1])) { chain.unshift(tokens[k - 1].value); k -= 2; }
        if (isId(tokens[k], "new")) continue; // new a.b.Tipo(: già contato come costruttore
        if (isP(tokens[k], ".")) {
          // il ricevitore è un'espressione: x.y().m(, (a).m(, "s".m(
          method.calls.push({ kind: "call", receiver: null, name: t.value, line: t.line });
        } else {
          method.calls.push({ kind: "call", receiver: chain.join("."), name: t.value, line: t.line });
        }
        continue;
      }
      // «tipo nome(» dentro un corpo: un metodo di una classe anonima o locale, non una chiamata
      if ((isId(prev) && !BEFORE_CALL.has(prev.value)) || isP(prev, ">") || isP(prev, "]")) continue;
      method.calls.push({ kind: "call", receiver: "", name: t.value, line: t.line });
    }
  }

  function localDecl(j, to) {
    let k = j;
    let name = tokens[k].value;
    while (isP(tokens[k + 1], ".") && isId(tokens[k + 2])) { name += "." + tokens[k + 2].value; k += 2; }
    k++;
    if (isP(tokens[k], "<")) {
      // solo nomi, punti, virgole, ?, [], & e altri <>: altrimenti è un confronto, non un generico
      let depth = 0;
      for (; k < to; k++) {
        const t = tokens[k];
        if (isP(t, "<")) depth++;
        else if (isP(t, ">")) { if (--depth === 0) { k++; break; } }
        else if (!(isId(t) || isP(t, ".") || isP(t, ",") || isP(t, "?") || isP(t, "[") || isP(t, "]") || isP(t, "&"))) return null;
      }
    }
    while (isP(tokens[k], "[") && isP(tokens[k + 1], "]")) k += 2;
    if (!isName(tokens[k])) return null;
    const after = tokens[k + 1];
    if (!(isP(after, "=") || isP(after, ";") || isP(after, ":") || isP(after, ",") || isP(after, ")"))) return null;
    if (!/^[\p{Lu}]/u.test(simple(name)) && !/\./.test(name)) return null;
    return { name: tokens[k].value, type: name };
  }

  function parseType(outer, annotations) {
    let kind;
    if (isP(peek(), "@")) { kind = "annotation"; i += 2; } else { kind = peek().value; i++; }
    const nameTok = peek();
    i++;
    const type = {
      name: nameTok.value,
      fqn: [outer ? outer.fqn : unit.package, nameTok.value].filter(Boolean).join("."),
      kind,
      line: nameTok.line,
      file,
      annotations,
      supers: [],
      fields: {},
      methods: [],
      outer: outer ? outer.fqn : null,
    };
    unit.types.push(type);

    // intestazione: extends e implements, fino alla graffa
    let angle = 0;
    let inSupers = false;
    while (i < tokens.length && !isP(peek(), "{")) {
      const t = peek();
      if (isP(t, "<")) { angle++; i++; continue; }
      if (isP(t, ">")) { angle--; i++; continue; }
      if (isP(t, "(")) { i = matchEnd(i, "(", ")"); continue; } // componenti di un record
      if (angle === 0 && (isId(t, "extends") || isId(t, "implements"))) { inSupers = true; i++; continue; }
      if (angle === 0 && inSupers && isId(t)) { type.supers.push(qualifiedName()); continue; }
      i++;
    }
    i++; // {
    parseTypeBody(type);
  }

  function parseTypeBody(type) {
    let pending = [];
    let buf = []; // i token del membro in corso, fino a ; o {
    let header = null; // { name, line, params, nameIndex } se il membro ha la forma di un metodo
    const reset = () => { pending = []; buf = []; header = null; };

    while (i < tokens.length) {
      const t = peek();
      if (isP(t, "}")) { i++; return; }
      if (isP(t, "@") && !isId(peek(1), "interface")) { pending.push(annotation()); continue; }
      if (buf.length === 0 && isTypeStart()) { parseType(type, pending); reset(); continue; }
      if (buf.length > 0 && isTypeStart() && buf.every((b) => isId(b))) { parseType(type, pending); reset(); continue; }

      if (isP(t, "(") && !header && !buf.some((b) => isP(b, "=")) && isName(buf[buf.length - 1])) {
        const nameTok = buf[buf.length - 1];
        const end = matchEnd(i, "(", ")");
        header = { name: nameTok.value, line: nameTok.line, params: params(i + 1, end - 1), isStatic: buf.some((b) => isId(b, "static")) };
        i = end;
        continue;
      }

      if (isP(t, "=") && !header) {
        // campo con inizializzatore: le chiamate dentro valgono per un metodo fittizio <field>
        const start = i + 1;
        let j = start;
        let depth = 0;
        for (; j < tokens.length; j++) {
          const x = tokens[j];
          if (isP(x, "(") || isP(x, "{") || isP(x, "[")) depth++;
          else if (isP(x, ")") || isP(x, "}") || isP(x, "]")) depth--;
          else if (depth === 0 && isP(x, ";")) break;
        }
        addField(type, buf);
        const init = initMethod(type);
        scanBody(start, j, init, type);
        i = j + 1;
        reset();
        continue;
      }

      if (isP(t, ";")) {
        if (header) addMethod(type, header, pending, null, null);
        else addField(type, buf);
        i++;
        reset();
        continue;
      }

      if (isP(t, "{")) {
        const end = matchEnd(i, "{", "}");
        if (header) {
          const method = addMethod(type, header, pending, t.line, tokens[end - 1].line);
          scanBody(i + 1, end - 1, method, type);
        } else if (type.kind !== "enum" || buf.length === 0) {
          scanBody(i + 1, end - 1, initMethod(type), type); // blocco di inizializzazione
        }
        i = end;
        reset();
        continue;
      }

      if (isP(t, ",") && type.kind === "enum" && !header) { buf = []; i++; continue; } // costanti di un enum
      buf.push(t);
      i++;
    }
  }

  function addField(type, buf) {
    const ids = buf.filter((b) => isId(b) && !["private", "protected", "public", "static", "final", "transient", "volatile"].includes(b.value));
    if (ids.length < 2) return;
    // Tipo<...> nome, oppure a.b.Tipo nome: il tipo è il primo nome, con i punti; il campo è l'ultimo
    let name = ids[0].value;
    for (let j = buf.indexOf(ids[0]) + 1; j + 1 < buf.length && isP(buf[j], ".") && isId(buf[j + 1]); j += 2) name += "." + buf[j + 1].value;
    type.fields[ids[ids.length - 1].value] = name;
  }

  function initMethod(type) {
    let m = type.methods.find((x) => x.name === "<init-fields>");
    if (!m) {
      m = { name: "<init-fields>", line: type.line, endLine: type.line, annotations: [], params: [], locals: {}, calls: [], isStatic: false, synthetic: true };
      type.methods.push(m);
    }
    return m;
  }

  function addMethod(type, header, annotations, startLine, endLine) {
    const method = {
      name: header.name,
      line: header.line,
      endLine: endLine || header.line,
      bodyLine: startLine,
      annotations,
      params: header.params,
      locals: {},
      calls: [],
      isStatic: header.isStatic,
      isConstructor: header.name === type.name,
    };
    type.methods.push(method);
    return method;
  }

  // ---- livello del file
  let pending = [];
  while (i < tokens.length) {
    const t = peek();
    if (isId(t, "package") && !isP(tokens[i - 1], ".")) {
      i++;
      unit.package = qualifiedName();
      continue;
    }
    if (isId(t, "import")) {
      i++;
      const isStatic = isId(peek(), "static");
      if (isStatic) i++;
      const name = qualifiedName();
      const wildcard = isP(peek(), ".") && isP(peek(1), "*");
      if (wildcard) i += 2;
      unit.imports.push({ name, static: isStatic, wildcard, line: t.line });
      continue;
    }
    if (isP(t, "@") && !isId(peek(1), "interface")) { pending.push(annotation()); continue; }
    if (isTypeStart()) { parseType(null, pending); pending = []; continue; }
    i++;
  }
  return unit;
}

module.exports = { tokenize, parseJava, simple };
