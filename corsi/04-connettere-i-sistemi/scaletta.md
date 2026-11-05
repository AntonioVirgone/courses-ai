# Corso 04 · Connettere i sistemi

Gli agenti non dovrebbero conoscere le API degli scanner. Questo corso costruisce il primo pezzo di Heimdall, da zero: un server MCP che restituisce gli alert di AppScan e SonarQube in un solo schema, con un backend simulato per il corso e uno reale per dopo, e il Data Retriever che legge gli alert solo da lì. Le credenziali restano sulla macchina di chi lo usa.

È la quarta lezione del [percorso Heimdall](../../docs/percorso-heimdall.md), e la prima che lavora sul plugin `heimdall` invece che su `acme-shop` (ADR-0005).

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 26 slide. Ogni slide ha un link diretto: `index.html#s7` apre il simulatore del normalizzatore.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 30 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Prerequisito:** i corsi [02](../02-subagenti-hook-mcp/scaletta.md) e [03](../03-orchestrare-agenti/scaletta.md). Servono i server MCP nei plugin, i subagenti e il contratto degli artefatti.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Perché un connettore | 3–4 | 10' | Gli agenti dipendono da un contratto, non dalle API; i tre scenari |
| 02 | Lo schema comune | 5–8 | 30' | Da AppScan e SonarQube a un solo schema; il simulatore; l'id stabile e la selezione |
| 03 | Il server MCP | 9–11 | 20' | Quattro strumenti; il protocollo a mano; il server che valida quello che restituisce |
| 04 | Backend e credenziali | 12–14 | 25' | Simulato e reale; dove stanno configurazione e credenziali; i server MCP ufficiali e la scelta delle API REST |
| 05 | Nei due strumenti | 15–16 | 15' | Il server nel plugin in Claude Code e Copilot; i nomi degli strumenti; il Data Retriever |
| — | Pausa | | 15' | |
| 06 | Laboratorio | 17–23 | 75' | Il plugin `heimdall` da una cartella vuota: scenari, normalizzatore, server, Data Retriever, backend reale contro un finto SonarQube, l'alert per la pipeline |
| — | Quiz, dove andiamo, risorse | 24–26 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino.
- Fai il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md). Il Passo 5 usa due terminali: prova prima che la porta 9000 sia libera.
- Prepara una risposta per chi chiede di provare il backend reale con i sistemi aziendali: in aula no (ADR-0004), dopo il corso sulla propria macchina, con la tabella «Il backend reale fuori dal corso» del README.
- Se vuoi la parte Copilot dal vivo, provala prima sulla tua versione. In Copilot il caricamento del server dal plugin, la delega al subagente e i nomi degli strumenti nel suo frontmatter sono documentati ma non provati in sessione (slide 15).

### I partecipanti

- Il repo `courses-ai` clonato e aggiornato.
- Claude Code: il corso è preparato con la 2.1.318.
- Node.js 18 o successivo e Git.
- Facoltativo: GitHub Copilot CLI.
