# Corso 05 · Capire il codice

Un alert dice che cosa ha visto lo scanner, non che cosa succede nel progetto. Questo corso aggiunge a Heimdall il Security Analyst. Prima un programma misura i fatti sul codice: dipendenza e righe del `pom.xml`, usi della libreria, catene dai punti d'ingresso, test. Poi il Security Analyst li verifica leggendo il codice, decide se l'alert è pertinente e scrive il primo piano di correzione.

È la quinta lezione del [percorso Heimdall](../../docs/percorso-heimdall.md). Parte dal plugin `heimdall` della lezione 04 e ne tiene una copia completa nel suo laboratorio (ADR-0007).

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 26 slide. Ogni slide ha un link diretto: `index.html#s7` apre il simulatore delle catene.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 30 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Prerequisito:** i corsi [03](../03-orchestrare-agenti/scaletta.md) e [04](../04-connettere-i-sistemi/scaletta.md). Servono il contratto degli artefatti, il plugin `heimdall` e l'alert `PAY-160644` preso in carico.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Perché capire il codice | 3–4 | 10' | Un alert non è ancora un problema; fatti misurati e giudizio; il pezzo di Heimdall di oggi |
| 02 | La pertinenza | 5–7 | 25' | Le tre domande e i tre esiti; raggiungibile non vuol dire sfruttabile; il simulatore delle catene |
| 03 | Albero e dipendenze | 8–11 | 35' | grep contro il parser; l'albero di un file e i suoi limiti; grafo e punti d'ingresso; pom, proprietà e metadati della libreria |
| 04 | Il Remediation Plan | 12–14 | 20' | `analysis.json` e che cosa ci aggiunge l'agente; il formato del piano; il piano v1 con il suo costo |
| 05 | Nei due strumenti | 15–16 | 10' | Il Security Analyst in Claude Code e Copilot; una copia del plugin per lezione |
| — | Pausa | | 15' | |
| 06 | Laboratorio | 17–23 | 75' | `payments-api`, l'albero di un file, `get_component`, l'analisi con una catena tolta, il Security Analyst nel plugin, il piano v1 |
| — | Quiz, dove andiamo, risorse | 24–26 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino.
- Fai il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md). Parti dallo stato di fine lezione 04, oppure dalla sua soluzione con i comandi di «Prima di iniziare».
- Annota quanto il tuo piano v1 si discosta da [`esempi/PAY-160644/plan-v1.md`](lab/esempi/PAY-160644/plan-v1.md): serve per rispondere a chi ne ottiene uno diverso. Il punto da non perdere è il passaggio a Java 11, scritto nel piano.
- Prepara una risposta per chi chiede di usare il parser su un progetto vero: è un parser minimale per il corso. I suoi limiti sono nel README del laboratorio, con gli strumenti completi da usare al suo posto.
- Se vuoi la parte Copilot dal vivo, provala prima sulla tua versione. In Copilot la delega al subagente, l'aggiornamento del marketplace locale e la reinstallazione non sono provati in sessione (slide 22).

### I partecipanti

- Il repo `courses-ai` clonato e aggiornato.
- Lo stato di fine lezione 04: `~/heimdall-lab/heimdall` installato da `heimdall-lab` e `~/heimdall-lab/payments-api/.pipeline/PAY-160644/alert.json`. Chi non ce l'ha lo ricrea in pochi minuti dalla soluzione della lezione 04.
- Claude Code: il corso è preparato con la 2.1.318.
- Node.js 18 o successivo e Git. Il JDK non serve: Heimdall legge il codice, non lo compila.
- Facoltativo: GitHub Copilot CLI.
