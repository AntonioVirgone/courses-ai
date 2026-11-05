---
name: retrieve-alerts
description: >-
  Mostra gli alert di sicurezza aperti dei progetti seguiti da Heimdall, normalizzati
  nello schema comune e ordinati per gravità, delegando la lettura al subagente
  data-retriever. Se la persona sceglie un alert, lo salva in .pipeline/<ID>/alert.json
  per la pipeline di remediation. Usala quando chiedono quali alert ci sono o di
  prendere in carico un alert.
argument-hint: "[progetto|tutti] [soglia]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/save-alert.js *)
---

# Alert dagli scanner

Richiesta: $ARGUMENTS. Può contenere un progetto, «tutti» o niente, e una soglia di gravità: critical, high, medium, low o info.

Tu non leggi gli scanner: lo fa il subagente `data-retriever`, che in Claude Code si chiama `heimdall:data-retriever`. Il subagente non vede questa conversazione: nel messaggio di delega metti i progetti, oppure «tutti», e la soglia.

1. Delega al `data-retriever` la lettura degli alert.
2. Mostra la sua risposta così com'è: la tabella e gli scartati.
3. Chiedi quale alert prendere in carico. Proponi il primo della tabella che non ha ancora una cartella `.pipeline/<ID>/`. Se la persona non ne vuole nessuno, fermati qui.
4. Per l'alert scelto lancia, dalla radice del progetto:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/save-alert.js <progetto> <ID>
   ```

   Non scrivere tu `alert.json` e non modificarlo: lo script lo copia dal server MCP, così nessun campo passa dal testo. Se lo script esce con 3, l'alert è già in carico: dillo e fermati.
5. Chiudi con il percorso del file salvato e il passo successivo, la pipeline di remediation: `/team-pipeline:remediation-plan <ID>`.
