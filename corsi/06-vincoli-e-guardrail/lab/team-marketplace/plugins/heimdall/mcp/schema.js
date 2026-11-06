// Un validatore minimo di JSON Schema, senza dipendenze.
// Copre solo quello che usa alert.schema.json: type (anche con null), enum, required,
// properties, additionalProperties: false, pattern e minimum.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ALERT_SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, "alert.schema.json"), "utf8"));

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

// Restituisce la lista dei problemi: vuota se il valore rispetta lo schema.
function validate(schema, value, where = "alert") {
  const problems = [];
  const actual = typeOf(value);
  if (schema.type) {
    const allowed = [].concat(schema.type);
    const ok = allowed.includes(actual) || (allowed.includes("number") && actual === "integer");
    if (!ok) return [`${where}: atteso ${allowed.join(" o ")}, trovato ${actual}`];
  }
  if (schema.enum && !schema.enum.includes(value)) {
    problems.push(`${where}: «${value}» non è tra ${schema.enum.join(", ")}`);
  }
  if (actual === "string" && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    problems.push(`${where}: «${value}» non rispetta ${schema.pattern}`);
  }
  if (actual === "integer" && schema.minimum !== undefined && value < schema.minimum) {
    problems.push(`${where}: ${value} è minore di ${schema.minimum}`);
  }
  if (actual === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) problems.push(`${where}: manca «${key}»`);
    }
    for (const [key, child] of Object.entries(value)) {
      const sub = (schema.properties || {})[key];
      if (sub) problems.push(...validate(sub, child, `${where}.${key}`));
      else if (schema.additionalProperties === false) problems.push(`${where}: campo non previsto «${key}»`);
    }
  }
  return problems;
}

module.exports = { ALERT_SCHEMA, validate, validateAlert: (alert) => validate(ALERT_SCHEMA, alert) };
