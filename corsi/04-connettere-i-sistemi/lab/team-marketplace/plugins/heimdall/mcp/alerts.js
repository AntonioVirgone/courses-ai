// Dallo scanner allo schema comune: normalizzazione e selezione degli alert.
// Qui non si interpreta il codice e non si propongono correzioni: si traduce e si sceglie.

"use strict";

const crypto = require("node:crypto");
const { validateAlert } = require("./schema");

const SEVERITIES = ["critical", "high", "medium", "low", "info"]; // dal più grave

// ---- AppScan

const APPSCAN_SEVERITY = { Critical: "critical", High: "high", Medium: "medium", Low: "low", Informational: "info" };
const APPSCAN_OPEN = ["Open", "New", "InProgress", "Reopened"];

function fromAppScan(project, item) {
  const dependency = Boolean(item.LibraryName);
  return {
    source: "appscan",
    scannerId: item.Id,
    open: APPSCAN_OPEN.includes(item.Status),
    security: true, // AppScan segnala solo problemi di sicurezza
    kind: dependency ? "dependency" : "code",
    rule: item.IssueType,
    severity: APPSCAN_SEVERITY[item.Severity],
    title: dependency ? `${item.IssueType}: ${item.LibraryName} ${item.LibraryVersion}` : item.IssueType,
    cwe: item.Cwe ? `CWE-${item.Cwe}` : null,
    location: { file: item.Location, line: item.Line ?? null },
    component: dependency ? { name: item.LibraryName, version: item.LibraryVersion, fixedIn: item.FixedVersion ?? null } : null,
    description: item.Description,
    suggestedFix: item.FixRecommendation ?? null,
    detectedAt: new Date(item.DateCreated).toISOString(),
  };
}

// ---- SonarQube

// impacts[].severity per la qualità SECURITY; se manca, la severity classica dell'issue
const SONAR_IMPACT = { BLOCKER: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low", INFO: "info" };
const SONAR_LEGACY = { BLOCKER: "critical", CRITICAL: "high", MAJOR: "medium", MINOR: "low", INFO: "info" };
const SONAR_OPEN = ["OPEN", "CONFIRMED", "REOPENED"];
// api/issues/search non restituisce la CWE: la ricaviamo dalla regola. Regola sconosciuta: null.
const SONAR_RULE_CWE = { "javasecurity:S3649": "CWE-89", "java:S5547": "CWE-327" };

function fromSonarQube(project, issue) {
  const security = (issue.impacts || []).find((i) => i.softwareQuality === "SECURITY");
  const status = issue.issueStatus || issue.status;
  return {
    source: "sonarqube",
    scannerId: issue.key,
    open: SONAR_OPEN.includes(status),
    security: issue.type === "VULNERABILITY" || Boolean(security),
    kind: "code",
    rule: issue.rule,
    severity: security ? SONAR_IMPACT[security.severity] : SONAR_LEGACY[issue.severity],
    title: issue.message,
    cwe: SONAR_RULE_CWE[issue.rule] ?? null,
    location: { file: issue.component.slice(issue.component.indexOf(":") + 1), line: issue.line ?? null },
    component: null,
    description: issue.message,
    suggestedFix: null, // SonarQube spiega la correzione nella regola, non nell'issue
    detectedAt: new Date(issue.creationDate.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")).toISOString(),
  };
}

// ---- selezione

// L'id nasce da che cosa segnala l'alert, non dal numero che gli dà lo scanner:
// lo stesso problema, letto due volte o da due scansioni, ha lo stesso id.
function fingerprint(a) {
  return [a.source, a.rule, a.location.file, a.location.line, a.component && a.component.name].join("|");
}

function alertId(key, a) {
  const n = parseInt(crypto.createHash("sha256").update(fingerprint(a)).digest("hex").slice(0, 8), 16);
  return `${key}-${100000 + (n % 900000)}`;
}

function rawItems(project, payload) {
  if (project.source === "appscan") return (payload.Items || []).map((item) => fromAppScan(project, item));
  if (project.source === "sonarqube") return (payload.issues || []).map((issue) => fromSonarQube(project, issue));
  throw new Error(`Scanner sconosciuto per ${project.project}: «${project.source}».`);
}

function selectAlerts(project, payload, { minSeverity } = {}) {
  const discarded = { closed: 0, notSecurity: 0, duplicate: 0, belowThreshold: 0 };
  const threshold = minSeverity ? SEVERITIES.indexOf(minSeverity) : SEVERITIES.length - 1;
  const seen = new Set();
  const alerts = [];

  for (const raw of rawItems(project, payload)) {
    if (!raw.open) { discarded.closed++; continue; }
    if (!raw.security) { discarded.notSecurity++; continue; }
    const id = alertId(project.key, raw);
    if (seen.has(id)) { discarded.duplicate++; continue; }
    seen.add(id);
    if (SEVERITIES.indexOf(raw.severity) > threshold) { discarded.belowThreshold++; continue; }

    const { open, security, ...fields } = raw;
    const alert = { id, project: project.project, ...fields };
    // il server garantisce il contratto: un alert fuori schema non esce
    const problems = validateAlert(alert);
    if (problems.length) {
      throw new Error(`L'alert ${fields.scannerId} di ${project.project} non rispetta lo schema comune:\n- ${problems.join("\n- ")}`);
    }
    alerts.push(alert);
  }

  alerts.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || a.id.localeCompare(b.id));
  return { alerts, discarded };
}

module.exports = { SEVERITIES, selectAlerts, fromAppScan, fromSonarQube };
