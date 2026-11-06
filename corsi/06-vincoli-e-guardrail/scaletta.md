# Corso 06 · Vincoli e guardrail

Un piano può essere giusto e non eseguibile: il piano v1 della lezione 05 corregge l'alert, ma porta `payments-api` a Java 11, e il progetto resta su Java 8. Questo corso aggiunge a Heimdall il Supervisor, che confronta ogni piano con i vincoli scritti dal team del progetto e lo rifiuta con le violazioni, e tre hook che fanno rispettare le regole che non si lasciano a un modello: il contratto degli artefatti, i test esistenti intoccabili, niente merge.

È la sesta lezione del [percorso Heimdall](../../docs/percorso-heimdall.md). Parte dal plugin `heimdall` della lezione 05 e ne tiene una copia completa nel suo laboratorio (ADR-0007).

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 29 slide. Ogni slide ha un link diretto: `index.html#s7` apre il simulatore del Supervisor, `index.html#s17` quello degli hook.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 30 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Prerequisito:** i corsi [03](../03-orchestrare-agenti/scaletta.md) e [05](../05-capire-il-codice/scaletta.md). Servono il ciclo di rifiuto del corso 03, il plugin `heimdall` 0.2.0 e il piano v1 di `PAY-160644`.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Perché i vincoli | 3–4 | 10' | Un piano onesto può essere ineseguibile; il pezzo di Heimdall di oggi |
| 02 | I vincoli del progetto | 5–7 | 25' | Dove stanno i vincoli e chi li scrive (ADR-0008); un vincolo che si può controllare; il simulatore del Supervisor |
| 03 | Il Supervisor | 8–11 | 30' | Violazione contro gusto; il verdetto e `checked`; il piano v1 rifiutato e il v2 approvato; il limite dei tre piani e la timeline |
| 04 | Gli hook come guardrail | 12–17 | 35' | Istruzione contro hook; i tre hook; che cosa conta come test; niente merge e il muro sul server; dove vale un hook di plugin; il simulatore degli hook |
| 05 | Nei due strumenti | 18 | 5' | Supervisor e hook in Claude Code e Copilot CLI |
| — | Pausa | | 15' | |
| 06 | Laboratorio | 19–26 | 70' | I vincoli in `payments-api`, gli hook a mano, il Supervisor nel plugin, il verdetto v1, il ciclo fino al v2, i guardrail dal vivo |
| — | Quiz, dove andiamo, risorse | 27–29 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino.
- Fai il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md). Parti dallo stato di fine lezione 05, oppure dalla sua soluzione con i comandi di «Prima di iniziare».
- Annota quanto il tuo piano v2 si discosta da [`esempi/PAY-160644/plan-v2.md`](lab/esempi/PAY-160644/plan-v2.md). Il punto da non perdere: Java resta 1.8 e `acme-xml` resta alla 1.4.2. Se il tuo v1 viene approvato, il Supervisor non ha letto i vincoli: guarda insieme ai partecipanti quali file ha aperto.
- Prepara una risposta per chi chiede «e se voglio cambiare un test?». Nei progetti con `.heimdall/vincoli.md` gli hook valgono per ogni agente con Heimdall installato: il test lo cambia una persona, o l'agente con il plugin disattivato.
- Prepara una risposta per chi chiede se un hook su Bash basta: no, è una rete. Il muro sono le branch policy e i permessi del token, nella lezione 07.
- Se vuoi la parte Copilot dal vivo, provala prima sulla tua versione. In Copilot la delega ai subagenti, l'hook su Bash e la reinstallazione del plugin non sono provati in sessione (slide 18).

### I partecipanti

- Il repo `courses-ai` clonato e aggiornato.
- Lo stato di fine lezione 05: `~/heimdall-lab/heimdall` 0.2.0 installato da `heimdall-lab` e `~/heimdall-lab/payments-api` in git, con `.pipeline/PAY-160644/` che contiene `alert.json`, `analysis.json` e `plan-v1.md`. Chi non ce l'ha lo ricrea in pochi minuti dalla soluzione della lezione 05.
- Claude Code: il corso è preparato con la 2.1.318.
- Node.js 18 o successivo e Git. Il JDK non serve.
- Facoltativo: GitHub Copilot CLI.
