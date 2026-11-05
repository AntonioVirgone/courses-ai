---
name: analyze-alert
description: >-
  Analizza un alert di sicurezza già preso in carico da Heimdall. Prima un programma
  misura i fatti sul codice del progetto (dipendenza e righe del pom.xml, usi della
  libreria, catene dai punti d'ingresso, test) e li salva in .pipeline/<ID>/analysis.json;
  poi il subagente security-analyst giudica se l'alert è pertinente e scrive il
  Remediation Plan v1, salvato in .pipeline/<ID>/plan-v1.md. Usala quando chiedono di
  analizzare un alert o di scriverne il piano di correzione.
argument-hint: "[id-alert]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js *)
---

# Analisi di un alert

Alert da analizzare: $ARGUMENTS. Gli artefatti stanno in `.pipeline/<ID>/`, nella radice del progetto.

Tu orchestri: i fatti li misura `analyze.js`, il giudizio e il piano li dà il subagente `security-analyst`, che in Claude Code si chiama `heimdall:security-analyst`. Non scrivere tu il piano e non modificare il codice.

1. Controlla che esista `.pipeline/<ID>/alert.json`. Se manca, fermati: l'alert si prende in carico con `retrieve-alerts`.
2. Lancia, dalla radice del progetto:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/analyze.js <ID>
   ```

   Mostra il riassunto che stampa. Se esce con 3, l'analisi c'è già: usa quella. Se esce con 1, riporta l'errore e fermati.
3. Se `.pipeline/<ID>/plan-v1.md` esiste già, fermati: il piano v1 non si riscrive. Le versioni successive arrivano dopo il verdetto del Supervisor.
4. Delega al `security-analyst` il giudizio e il piano. Il subagente non vede questa conversazione: nel messaggio di delega metti il percorso della cartella `.pipeline/<ID>/`.
5. Se risponde «Alert non pertinente», riporta il motivo e fermati, senza scrivere file.
6. Altrimenti salva la sua risposta così com'è in `.pipeline/<ID>/plan-v1.md`, con lo strumento di scrittura dei file (Write in Claude Code).
7. Chiudi in poche righe: l'esito della pertinenza, la correzione proposta, che cosa costa (per esempio un'altra versione di Java), i file toccati. Il passo successivo è il verdetto del Supervisor.
