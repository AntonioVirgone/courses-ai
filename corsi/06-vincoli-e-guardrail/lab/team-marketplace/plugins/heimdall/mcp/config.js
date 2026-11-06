// La configurazione di Heimdall. Tre posti, tre tipi di informazione:
//   HEIMDALL_BACKEND           variabile d'ambiente: simulated (predefinito) o real
//   HEIMDALL_CONFIG            file locale, fuori da ogni repo: progetti e indirizzi degli scanner, niente segreti
//   HEIMDALL_*_TOKEN e simili  variabili d'ambiente: le credenziali, lette solo dal backend reale
// Nessun valore di queste impostazioni sta nel plugin o nei prompt (ADR-0004).

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const BACKENDS = ["simulated", "real"];
const DEFAULT_CONFIG_FILE = path.join(os.homedir(), ".config", "heimdall", "config.json");

// Una variabile vuota o non sostituita (per esempio «${HEIMDALL_BACKEND}») vale come non impostata.
function setting(env, name) {
  const value = (env[name] || "").trim();
  return value && !value.startsWith("${") ? value : undefined;
}

function loadConfig(env = process.env) {
  const backend = setting(env, "HEIMDALL_BACKEND") || "simulated";
  if (!BACKENDS.includes(backend)) {
    throw new Error(`HEIMDALL_BACKEND vale «${backend}»: i valori ammessi sono ${BACKENDS.join(" e ")}.`);
  }
  return {
    backend,
    scenariosDir: setting(env, "HEIMDALL_SCENARIOS") || path.join(__dirname, "..", "scenarios"),
    configFile: setting(env, "HEIMDALL_CONFIG") || DEFAULT_CONFIG_FILE,
  };
}

// Legge il file locale. Restituisce null se non c'è: lo segnala backend_status.
function readConfigFile(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Il file di configurazione ${file} non è JSON valido: ${err.message}`);
  }
}

module.exports = { loadConfig, readConfigFile, setting, DEFAULT_CONFIG_FILE };
