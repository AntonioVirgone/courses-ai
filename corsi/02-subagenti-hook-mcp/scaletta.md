# Corso 02 · Subagenti, hook e server MCP nel plugin

Le skill insegnano all'agente come lavoriamo. Questo corso aggiunge i tre componenti che il corso 01 nominava soltanto:
- un subagente che rivede il lavoro in un contesto separato;
- un hook che fa rispettare una regola senza eccezioni;
- un server MCP che dà all'agente accesso ai dati del progetto.

Li mette nello stesso plugin e mostra come misurare con le eval se il plugin migliora davvero le risposte.

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 27 slide. Ogni slide ha un link diretto: `index.html#s10` apre il simulatore dell'hook.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 30 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Prerequisito:** il [corso 01](../01-skill-e-plugin/scaletta.md). Il laboratorio riparte dal progetto `acme-shop` e dal marketplace costruiti lì.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Oltre le skill | 3–4 | 10' | Quali problemi una skill non risolve; il plugin `team-guardrails` |
| 02 | Subagenti | 5–7 | 20' | Contesto separato, delega, il file del subagente, i limiti nei plugin, le differenze con Copilot |
| 03 | Hook | 8–11 | 25' | Eventi e matcher, il contratto stdin e codice d'uscita, il simulatore, i formati di Claude e Copilot |
| 04 | Server MCP | 12–14 | 20' | Il protocollo, il dialogo client-server passo per passo, `.mcp.json` e nomi degli strumenti |
| 05 | Tutto nel plugin | 15–16 | 10' | La struttura di `team-guardrails`; che cosa funziona in Claude Code, Copilot CLI e VS Code |
| 06 | Misurare con le eval | 17–18 | 15' | Due bracci e Δ, grader, mock MCP, costo in token |
| — | Pausa | | 15' | |
| 07 | Laboratorio | 19–24 | 75' | Subagente, hook, server MCP, impacchettamento nel marketplace, un caso di eval |
| — | Quiz, dove andiamo, risorse | 25–27 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino.
- Fai il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md).
- Decidi se far eseguire le eval in aula. Ogni run consuma token sull'account di chi la lancia; in alternativa mostra un `report.html` preparato prima.
- Se vuoi provare la parte Copilot dal vivo, verifica prima sulla tua versione che l'hook e il subagente si carichino: in Copilot sono documentati ma non provati in sessione (slide 16).

### I partecipanti

- Il laboratorio del corso 01 completato, oppure la cartella `~/skill-lab` ricreata come spiega il suo [README](../01-skill-e-plugin/lab/README.md).
- Claude Code 2.1.269 o successivo, per `claude plugin eval`.
- Node.js 18 o successivo e Git 2.31 o successivo.
- Facoltativo: GitHub Copilot CLI.
