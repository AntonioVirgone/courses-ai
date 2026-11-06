---
name: supervise-plan
description: >-
  Porta il Remediation Plan di un alert già analizzato da Heimdall fino al verdetto del
  Supervisor. Il subagente supervisor valuta .pipeline/<ID>/plan-vN.md contro i vincoli
  del progetto in .heimdall/vincoli.md; se lo rifiuta, il security-analyst scrive la
  versione successiva rispondendo a ogni violazione, fino all'approvazione o al limite
  di tre piani. Usala quando chiedono di approvare, verificare o supervisionare il piano
  di un alert.
argument-hint: "[id-alert]"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline.js *)
---

# Il verdetto del Supervisor

Alert da trattare: $ARGUMENTS. Gli artefatti stanno in `.pipeline/<ID>/`, i vincoli in `.heimdall/vincoli.md`, nella radice del progetto.

Tu orchestri e basta: i verdetti li dà il subagente `supervisor`, i piani li scrive il subagente `security-analyst`. In Claude Code si chiamano `heimdall:supervisor` e `heimdall:security-analyst`. Non scrivere tu piani o verdetti, non modificare il codice e non toccare i vincoli.

I subagenti non vedono questa conversazione: nel messaggio di delega metti sempre i percorsi dei file che devono leggere.

1. Controlla che esistano `.heimdall/vincoli.md` e `.pipeline/<ID>/plan-v1.md`. Se manca il primo, fermati: i vincoli li scrive il team del progetto. Se manca il secondo, fermati: il piano v1 si scrive con `analyze-alert`.
2. Guarda a che punto è la pipeline:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/timeline.js <ID>
   ```

   Se esce con 0 il piano è già approvato, se esce con 3 i tentativi sono finiti: mostra la timeline e fermati. Altrimenti riparti dal passo che indica, con N uguale al numero dell'ultimo piano.
3. Ciclo:
   1. Delega al `supervisor` il verdetto sul piano vN. Passagli il percorso di `.pipeline/<ID>/plan-vN.md`.
   2. Salva la sua risposta così com'è in `.pipeline/<ID>/verdict-vN.json`, con lo strumento di scrittura dei file (Write in Claude Code).
   3. Se il verdetto è `approved`, esci dal ciclo.
   4. Se è `rejected`, delega al `security-analyst` il piano v(N+1). Passagli la cartella `.pipeline/<ID>/`, il numero N+1 e il percorso di `verdict-vN.json`.
   5. Salva la sua risposta così com'è in `.pipeline/<ID>/plan-v<N+1>.md` e ripeti dal punto 1 con N+1.

Un hook controlla ogni scrittura in `.pipeline/`. Se blocca un Write, leggi il motivo:
- se riguarda il formato del piano o del verdetto, rimanda il testo all'agente che l'ha prodotto, con il motivo, e salva la nuova risposta;
- se dice che il limite dei piani è raggiunto, fermati: decide una persona.

Non riscrivere mai un artefatto che esiste già e non cancellarlo: ogni versione resta come traccia.

4. Alla fine mostra la timeline, con lo stesso comando del punto 2.
5. Riassumi in poche righe: quanti piani, quali vincoli ha fatto valere il Supervisor e come li ha risolti il piano successivo, l'esito. Se il piano è approvato, il passo successivo è il Resolver. Se i tentativi sono finiti, elenca le violazioni rimaste: decide una persona.
