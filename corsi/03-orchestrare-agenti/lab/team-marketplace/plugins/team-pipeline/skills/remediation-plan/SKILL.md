---
name: remediation-plan
description: >-
  Porta un alert di acme-shop da .pipeline/<ALERT>/alert.json a un piano di
  correzione approvato, alternando i subagenti analyst e supervisor fino
  all'approvazione o al limite di tre piani. Usala quando chiedono di
  pianificare la correzione di un alert.
argument-hint: "[id-alert]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline.js *)
---

# Pipeline di remediation

Alert da trattare: $ARGUMENTS. Gli artefatti stanno in `.pipeline/<ALERT>/`.

Tu orchestri e basta: i piani li scrive il subagente `analyst`, i verdetti il subagente `supervisor`. In Claude Code si chiamano `team-pipeline:analyst` e `team-pipeline:supervisor`. Non scrivere tu piani o verdetti e non modificare il codice: lo farà il Resolver, in un passo successivo.

I subagenti non vedono questa conversazione: nel messaggio di delega metti sempre i percorsi dei file che devono leggere.

Ciclo, con N che parte da 1:

1. Delega all'`analyst` il piano vN. Passagli la cartella dell'alert e N; se N è maggiore di 1, anche il percorso di `verdict-v<N-1>.json`.
2. Salva la sua risposta così com'è in `.pipeline/<ALERT>/plan-vN.md`, con Write. Se risponde «Alert non pertinente», fermati e riporta il motivo.
3. Delega al `supervisor` il verdetto. Passagli il percorso di `plan-vN.md`.
4. Salva la sua risposta così com'è in `.pipeline/<ALERT>/verdict-vN.json`, con Write.
5. Se il verdetto è `approved`, la pipeline è finita. Se è `rejected`, ripeti dal punto 1 con N+1.

Un hook controlla ogni scrittura in `.pipeline/`. Se blocca un Write, leggi il motivo:
- se riguarda il formato del piano o del verdetto, rimanda il testo all'agente che l'ha prodotto, con il motivo, e salva la nuova risposta;
- se dice che il limite dei piani è raggiunto, fermati: decide una persona.

Non riscrivere mai un artefatto che esiste già e non cancellarlo: ogni versione resta come traccia.

Alla fine mostra la timeline:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline.js .pipeline/<ALERT>
```

Poi riassumi in poche righe: quanti piani, che cosa ha rifiutato il supervisor e perché, l'esito.
