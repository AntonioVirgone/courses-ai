# Corso 01 · Skill e plugin per agenti di coding

Come insegnare una volta sola all'agente il modo in cui lavoriamo, impacchettarlo in un plugin e distribuirlo al team. Con Claude Code e GitHub Copilot, e due raccolte pronte da usare: le skill di Matt Pocock e graphify.

- **Presentazione:** [presentazione/index.html](presentazione/index.html), 37 slide. Ogni slide ha un link diretto: `index.html#s12` apre la dodicesima.
- **Laboratorio:** [lab/](lab/)
- **Durata indicativa:** 3 ore e 45 minuti, con una pausa da 15 minuti prima del laboratorio.
- **Pubblico:** sviluppatori che usano già Claude Code o Copilot e non hanno mai scritto una skill.

## Tappe

Le durate sono una stima da tarare dopo la prima edizione.

| # | Tappa | Slide | Durata | Cosa si porta a casa |
|---|-------|-------|--------|----------------------|
| — | Copertina e agenda | 1–2 | 5' | Obiettivo della sessione |
| 01 | Perché skill e plugin | 3–5 | 10' | Il problema delle istruzioni ripetute; progressive disclosure; quando usare istruzioni, skill, subagenti, hook, MCP e plugin |
| 02 | Come usare skill e plugin | 6–7 | 10' | Invocazione esplicita e implicita; i comandi essenziali nei due strumenti |
| 03 | Creare una skill | 8–12 | 25' | Anatomia, frontmatter, come scrivere la description, generatore interattivo, buone pratiche |
| 04 | Impacchettare in un plugin | 13–15 | 15' | Manifest, marketplace, un plugin per tutti e due gli strumenti |
| 05 | Claude Code e Copilot a confronto | 16 | 10' | La tabella delle differenze |
| 06 | Le skill di Matt Pocock | 17–18 | 10' | Che cosa sono e il catalogo |
| 07 | Perché usarle | 19–20 | 10' | Il flusso dall'idea alla PR e i vantaggi |
| 08 | Installarle e usarle | 21–22 | 10' | Installazione nei due strumenti, primo giro su un repo |
| 09 | graphify | 23–24 | 10' | Il codebase come grafo; che cosa c'è in `graphify-out/` |
| 10 | Perché usare graphify | 25–26 | 10' | Il grafo interattivo; vantaggi e limiti |
| 11 | Installare e usare graphify | 27–28 | 10' | Installazione e comandi |
| — | Pausa | | 15' | |
| 12 | Laboratorio | 29–34 | 60' | Le tre skill, il plugin `team-toolkit`, il marketplace, l'installazione nei due strumenti |
| — | Quiz, dove andiamo, risorse | 35–37 | 15' | Verifica a voce; il percorso verso Heimdall; link per approfondire |

## Da preparare prima

### Il relatore

- Apri la presentazione nel browser che userai e controlla che i font si carichino. Offline il browser usa i caratteri di sistema.
- Tieni aperte le note del relatore (tasto `N`) su un secondo schermo, se c'è.
- Prepara un terminale con Claude Code e uno con Copilot CLI per le demo delle tappe 02, 08 e 11.
- Per la tappa 11 installa graphify (`uv tool install graphifyy`) e costruisci prima il grafo di un repo di prova: la prima costruzione richiede tempo.
- Prova il laboratorio dall'inizio alla fine sulla tua macchina, seguendo [lab/README.md](lab/README.md).
- Controlla che tutti i partecipanti abbiano accesso in lettura a questo repo: serve al Passo 5 e per installare la soluzione.

### I partecipanti

- Claude Code installato e con accesso (`claude --version`).
- GitHub Copilot CLI installato e con accesso (`copilot --version`), se si vuole provare anche Copilot.
- Git e un account GitHub con accesso a questo repo.
- Facoltativo: GitHub CLI 2.90 o successiva, per `gh skill`.
- Facoltativo: `uv` o `pipx`, per installare graphify.
