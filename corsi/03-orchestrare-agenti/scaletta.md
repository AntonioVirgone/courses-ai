# Corso 03 · Orchestrare più agenti

Un agente che analizza e approva da solo il proprio lavoro non ha nessuno che lo controlli. Questo corso divide il lavoro tra due agenti con contesti separati: un analyst che scrive il piano di correzione di un alert e un supervisor che lo valuta contro i vincoli del progetto. I due si passano il lavoro attraverso artefatti versionati: alert, piano, verdetto. Un piano rifiutato si rielabora, fino a un limite deciso da un programma e non dal modello.

È la terza lezione del [percorso Heimdall](../../docs/percorso-heimdall.md): costruisce lo scheletro della pipeline, che le lezioni successive riempiono con gli agenti veri.

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 25 slide. Ogni slide ha un link diretto: `index.html#s9` apre il simulatore della pipeline.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 25 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Prerequisito:** il [corso 02](../02-subagenti-hook-mcp/scaletta.md). Servono i subagenti, gli hook `PreToolUse` e i plugin.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Da un agente a una pipeline | 3–4 | 10' | Perché dividere il lavoro tra più agenti; il pezzo di Heimdall di oggi |
| 02 | Ruoli e artefatti | 5–7 | 20' | Orchestratore, analyst, supervisor; alert, piano e verdetto come file; il contratto |
| 03 | Rifiuti e tentativi | 8–10 | 25' | Il ciclo di rifiuto e rielaborazione, il simulatore, chi conta i tentativi |
| 04 | Chi orchestra | 11–13 | 25' | Skill e subagenti contro uno script; il confronto; la strada mista del laboratorio |
| 05 | Nei due strumenti | 14–15 | 15' | Delegare e chiamare gli agenti in Claude Code e Copilot; la modalità non interattiva |
| — | Pausa | | 15' | |
| 06 | Laboratorio | 16–22 | 75' | Il plugin `team-pipeline`: l'hook a mano, il supervisor da solo, la pipeline con la skill, la timeline, la stessa pipeline da script |
| — | Quiz, dove andiamo, risorse | 23–25 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino.
- Fai il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md). Annota quante volte il piano v1 viene rifiutato: serve per rispondere a chi lo vede approvato al primo colpo.
- Decidi se far lanciare `run-pipeline.sh` in aula. Ogni versione del piano costa due chiamate al modello. In alternativa mostralo sul tuo schermo.
- Se vuoi la parte Copilot dal vivo, provala prima sulla tua versione. In Copilot la delega ai subagenti e l'hook sono documentati ma non provati in sessione (slide 14).

### I partecipanti

- Il repo `courses-ai` clonato e il marketplace `courses-ai` registrato, come nel corso 01.
- Claude Code: il corso è preparato con la 2.1.318.
- Node.js 18 o successivo e Git.
- Facoltativo: GitHub Copilot CLI.
