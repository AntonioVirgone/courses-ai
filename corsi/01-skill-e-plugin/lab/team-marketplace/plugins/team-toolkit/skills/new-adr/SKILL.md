---
name: new-adr
description: Crea un nuovo Architecture Decision Record in docs/adr
  con il numero successivo e il template del team.
argument-hint: "[la decisione]"
disable-model-invocation: true
---

ADR esistenti:
!`ls docs/adr`

Crea `docs/adr/NNNN-<slug>.md`: numero successivo a quattro cifre, slug
in italiano preso dalla decisione. Parti da [template.md](template.md).
Decisione: $ARGUMENTS

- Il titolo è la decisione in una frase, non l'argomento.
- Il corpo spiega in prosa che cosa si è deciso e perché.
- `## Considered Options` elenca le alternative:
  `- **Nome.** Scartato: motivo.` (o Rimandato a …).
- Se la decisione cambia un ADR esistente, non riscriverlo: in cima
  al vecchio aggiungi `> **Superata da ADR-NNNN** su …. Il resto resta in vigore.`

Fammi le domande che mancano sulle alternative, poi scrivi il file.
L'ADR va in un commit `docs:` a sé.
