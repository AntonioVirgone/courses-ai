// Backend simulato: legge gli export degli scanner preparati negli scenari.
// Ogni scenario è una cartella con project.json e il file esportato dallo scanner.
// I dati sono inventati (ADR-0004): nessuna credenziale, nessun sistema aziendale.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Non riesco a leggere ${file}: ${err.message}`);
  }
}

function createSimulatedBackend({ scenariosDir }) {
  return {
    name: "simulated",

    async listProjects() {
      if (!fs.existsSync(scenariosDir)) throw new Error(`La cartella degli scenari ${scenariosDir} non esiste.`);
      return fs
        .readdirSync(scenariosDir)
        .filter((name) => fs.existsSync(path.join(scenariosDir, name, "project.json")))
        .sort()
        .map((name) => readJson(path.join(scenariosDir, name, "project.json")));
    },

    async fetchFindings(project) {
      return readJson(path.join(scenariosDir, project.project, project.export));
    },

    async status() {
      const projects = await this.listProjects();
      return {
        backend: "simulated",
        scenarios: scenariosDir,
        projects: projects.map((p) => p.project),
        credentials: "nessuna: i dati degli scenari sono inventati",
      };
    },
  };
}

module.exports = { createSimulatedBackend };
