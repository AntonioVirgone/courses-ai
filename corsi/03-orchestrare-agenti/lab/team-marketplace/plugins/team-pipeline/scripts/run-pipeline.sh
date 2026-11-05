#!/usr/bin/env bash
# La stessa pipeline della skill remediation-plan, orchestrata da uno script.
# Il modello scrive piani e verdetti; il ciclo, il limite dei tentativi e il contratto degli artefatti
# li decide questo script, riusando hooks/guard-pipeline.js come controllo prima di ogni scrittura.
#
# Uso, dalla radice del progetto: bash <plugin>/scripts/run-pipeline.sh ACME-101
# Richiede Claude Code con il plugin team-pipeline installato. Ogni fase è una chiamata `claude -p`.

set -euo pipefail

ALERT="${1:?Uso: run-pipeline.sh ID-ALERT, per esempio ACME-101}"
DIR=".pipeline/$ALERT"
MAX_PLANS=3
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$(cat "$PLUGIN_ROOT/scripts/verdict.schema.json")"

[ -f "$DIR/alert.json" ] || { echo "Non trovo $DIR/alert.json" >&2; exit 2; }
if ls "$DIR"/plan-v*.md >/dev/null 2>&1; then
  echo "In $DIR ci sono già dei piani: lo script parte solo da una pipeline nuova." >&2
  exit 2
fi

# Passa il file all'hook come se fosse un Write dell'agente: stesso contratto, stessi messaggi.
guard() {
  local file="$1" content="$2"
  node -e 'process.stdout.write(JSON.stringify({tool_name: "Write", tool_input: {file_path: process.argv[1], content: process.argv[2]}}))' \
    "$PWD/$file" "$content" | node "$PLUGIN_ROOT/hooks/guard-pipeline.js"
}

for v in $(seq 1 "$MAX_PLANS"); do
  previous=""
  if [ "$v" -gt 1 ]; then
    previous="Il piano v$((v - 1)) è stato rifiutato: leggi $DIR/plan-v$((v - 1)).md e il verdetto $DIR/verdict-v$((v - 1)).json."
  fi

  echo "· v$v analyst" >&2
  plan="$(claude -p --agent team-pipeline:analyst --max-turns 15 \
    "Scrivi il piano v$v per l'alert in $DIR/alert.json. $previous")"
  guard "$DIR/plan-v$v.md" "$plan" || { echo "Piano v$v scartato dal controllo: si ferma qui." >&2; exit 2; }
  printf '%s\n' "$plan" > "$DIR/plan-v$v.md"

  echo "· v$v supervisor" >&2
  verdict="$(claude -p --agent team-pipeline:supervisor --max-turns 15 \
    --output-format json --json-schema "$SCHEMA" \
    "Valuta il piano $DIR/plan-v$v.md contro .pipeline/vincoli.md." |
    node -e 'let s = ""; process.stdin.on("data", (c) => (s += c)).on("end", () => process.stdout.write(JSON.stringify(JSON.parse(s).structured_output, null, 2)))')"
  guard "$DIR/verdict-v$v.json" "$verdict" || { echo "Verdetto v$v scartato dal controllo: si ferma qui." >&2; exit 2; }
  printf '%s\n' "$verdict" > "$DIR/verdict-v$v.json"

  decision="$(node -p 'JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).decision' "$DIR/verdict-v$v.json")"
  [ "$decision" = "approved" ] && break
done

node "$PLUGIN_ROOT/scripts/timeline.js" "$DIR"
