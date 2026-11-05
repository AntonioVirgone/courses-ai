// Il connettore: sceglie il backend, normalizza e seleziona gli alert.
// Lo usano il server MCP e gli script: un solo contratto, più ingressi.

"use strict";

const { loadConfig } = require("./config");
const { selectAlerts, SEVERITIES } = require("./alerts");
const { createSimulatedBackend } = require("./backends/simulated");
const { createRealBackend } = require("./backends/real");

function createConnector(env = process.env) {
  const config = loadConfig(env);
  const backend = config.backend === "real" ? createRealBackend(config, env) : createSimulatedBackend(config);

  async function project(name) {
    const projects = await backend.listProjects();
    const found = projects.find((p) => p.project === name);
    if (!found) {
      const names = projects.map((p) => p.project).join(", ") || "nessuno";
      throw new Error(`Il progetto «${name}» non c'è nel backend ${backend.name}. Progetti disponibili: ${names}.`);
    }
    return found;
  }

  return {
    backend: backend.name,

    async listProjects() {
      const projects = await backend.listProjects();
      return projects.map(({ project, stack, source }) => ({ project, stack, source }));
    },

    async listAlerts(name, { minSeverity } = {}) {
      if (minSeverity !== undefined && !SEVERITIES.includes(minSeverity)) {
        throw new Error(`min_severity deve essere uno tra ${SEVERITIES.join(", ")}.`);
      }
      const p = await project(name);
      const payload = await backend.fetchFindings(p);
      const { alerts, discarded } = selectAlerts(p, payload, { minSeverity });
      return { project: p.project, source: p.source, backend: backend.name, count: alerts.length, discarded, alerts };
    },

    async getAlert(name, id) {
      const { alerts } = await this.listAlerts(name);
      const alert = alerts.find((a) => a.id === id);
      if (!alert) throw new Error(`L'alert «${id}» non è tra gli alert aperti di ${name}. Usa list_alerts per vedere gli id.`);
      return alert;
    },

    status() {
      return backend.status();
    },
  };
}

module.exports = { createConnector, SEVERITIES };
