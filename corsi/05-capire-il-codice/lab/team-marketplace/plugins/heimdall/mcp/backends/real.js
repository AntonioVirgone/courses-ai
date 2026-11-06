// Backend reale: legge gli alert dalle API REST degli scanner, con le credenziali di chi lo esegue.
// Progetti e indirizzi stanno nel file locale HEIMDALL_CONFIG, le credenziali in variabili d'ambiente.
// Restituisce gli stessi dati grezzi del backend simulato: normalizzazione e selezione sono comuni.

"use strict";

const { readConfigFile, setting } = require("../config");

const SCANNERS = {
  sonarqube: { secrets: ["HEIMDALL_SONARQUBE_TOKEN"], projectField: "sonarqubeProject" },
  appscan: { secrets: ["HEIMDALL_APPSCAN_KEY_ID", "HEIMDALL_APPSCAN_KEY_SECRET"], projectField: "appscanApplication" },
};
const PAGE_SIZE = 500;
const MAX_PAGES = 20;

// Un errore HTTP raccontato senza credenziali: solo metodo, percorso e stato.
async function request(url, init, what) {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  } catch (err) {
    throw new Error(`${what}: non riesco a raggiungere ${new URL(url).origin} (${err.cause?.code || err.name}).`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`${what}: accesso negato (HTTP ${res.status}). Controlla le credenziali nelle variabili d'ambiente.`);
  }
  if (!res.ok) throw new Error(`${what}: ${init.method || "GET"} ${new URL(url).pathname} ha risposto HTTP ${res.status}.`);
  return res.json();
}

async function sonarqubeIssues(scanner, project, env) {
  const token = setting(env, "HEIMDALL_SONARQUBE_TOKEN");
  const issues = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL("api/issues/search", scanner.url.replace(/\/?$/, "/"));
    url.searchParams.set("components", project.sonarqubeProject);
    url.searchParams.set("resolved", "false");
    url.searchParams.set("ps", String(PAGE_SIZE));
    url.searchParams.set("p", String(page));
    const body = await request(url, { headers: { Authorization: `Bearer ${token}` } }, `SonarQube, progetto ${project.project}`);
    issues.push(...(body.issues || []));
    const total = body.paging ? body.paging.total : body.total;
    if (!total || issues.length >= total || !(body.issues || []).length) break;
  }
  return { issues };
}

async function appscanIssues(scanner, project, env) {
  const base = scanner.url.replace(/\/?$/, "/");
  const login = await request(
    new URL("api/v4/Account/ApiKeyLogin", base),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ KeyId: setting(env, "HEIMDALL_APPSCAN_KEY_ID"), KeySecret: setting(env, "HEIMDALL_APPSCAN_KEY_SECRET") }),
    },
    "AppScan, accesso",
  );
  // paginazione OData con $top e $skip: non verificata sull'API vera (vedi il README del laboratorio)
  const items = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`api/v4/Issues/Application/${encodeURIComponent(project.appscanApplication)}`, base);
    url.searchParams.set("$top", String(PAGE_SIZE));
    url.searchParams.set("$skip", String(page * PAGE_SIZE));
    const body = await request(url, { headers: { Authorization: `Bearer ${login.Token}`, Accept: "application/json" } }, `AppScan, progetto ${project.project}`);
    const batch = body.Items || [];
    items.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return { Items: items };
}

function createRealBackend(config, env) {
  const file = readConfigFile(config.configFile);

  function projects() {
    return Object.entries((file && file.projects) || {}).map(([name, p]) => ({ project: name, ...p }));
  }

  // Che cosa manca per leggere gli alert di uno scanner: nomi di file e variabili, mai valori.
  function missingFor(source) {
    const missing = [];
    if (!file) return [`il file di configurazione ${config.configFile}`];
    if (!(file[source] && file[source].url)) missing.push(`${source}.url in ${config.configFile}`);
    for (const name of SCANNERS[source].secrets) if (!setting(env, name)) missing.push(`la variabile d'ambiente ${name}`);
    return missing;
  }

  return {
    name: "real",

    async listProjects() {
      if (!file) throw new Error(`Backend reale: manca il file di configurazione ${config.configFile}. Parti da config.example.json del plugin.`);
      const list = projects();
      for (const p of list) {
        if (!SCANNERS[p.source]) throw new Error(`Backend reale: il progetto ${p.project} ha source «${p.source}», atteso appscan o sonarqube.`);
        if (!p.key || !p[SCANNERS[p.source].projectField]) {
          throw new Error(`Backend reale: al progetto ${p.project} servono key e ${SCANNERS[p.source].projectField} in ${config.configFile}.`);
        }
      }
      return list;
    },

    async fetchFindings(project) {
      const missing = missingFor(project.source);
      if (missing.length) throw new Error(`Backend reale non configurato per ${project.source}. Manca: ${missing.join("; ")}.`);
      const scanner = file[project.source];
      return project.source === "sonarqube" ? sonarqubeIssues(scanner, project, env) : appscanIssues(scanner, project, env);
    },

    // Da dove leggere i metadati delle librerie nel backend reale (repository Maven aziendale,
    // Maven Central, note di rilascio) non è ancora deciso: lo strumento lo dice invece di inventare.
    async fetchComponents() {
      throw new Error("Backend reale: get_component non è ancora disponibile. Da dove leggere i metadati delle librerie si decide più avanti nel percorso.");
    },

    async status() {
      const used = [...new Set(projects().map((p) => p.source))];
      const scanners = {};
      for (const source of used) {
        scanners[source] = {
          url: file && file[source] ? file[source].url || null : null,
          credentials: Object.fromEntries(SCANNERS[source].secrets.map((n) => [n, setting(env, n) ? "impostata" : "manca"])),
        };
      }
      const missing = file ? used.flatMap(missingFor) : missingFor("sonarqube").slice(0, 1);
      return {
        backend: "real",
        configFile: config.configFile,
        configFound: Boolean(file),
        projects: projects().map((p) => `${p.project} (${p.source})`),
        scanners,
        ready: Boolean(file) && used.length > 0 && missing.length === 0,
        missing,
      };
    },
  };
}

module.exports = { createRealBackend };
