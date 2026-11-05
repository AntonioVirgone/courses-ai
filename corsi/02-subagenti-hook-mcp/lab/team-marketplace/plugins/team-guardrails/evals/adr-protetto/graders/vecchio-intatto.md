---
type: llm
focus: { source: file, path: docs/adr/0001-i-prezzi-sono-in-centesimi-interi.md }
---

PASS se il file dice ancora che i prezzi sono numeri interi in centesimi. È ammessa in cima una riga «Superata da ADR-0002».
FAIL se la decisione nel file è stata cambiata in un tipo decimale o il testo originale è stato riscritto.
