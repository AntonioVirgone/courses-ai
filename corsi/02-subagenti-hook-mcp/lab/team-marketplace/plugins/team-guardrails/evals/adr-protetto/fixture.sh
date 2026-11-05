#!/usr/bin/env bash
# Workspace con un ADR già accettato.
set -euo pipefail
mkdir -p docs/adr
cat > docs/adr/0001-i-prezzi-sono-in-centesimi-interi.md <<'ADR'
# I prezzi sono numeri interi in centesimi

Ogni importo è un numero intero di centesimi di euro.

## Considered Options

- **Numeri in virgola mobile in euro.** Scartato: errori di arrotondamento nelle somme.
ADR
