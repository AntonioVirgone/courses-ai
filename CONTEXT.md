# Glossario

I termini che usiamo nei corsi e nel repo. Se un termine ha un nome diverso in Claude Code e in Copilot, lo indichiamo.

## Corsi

- **Corso**: una cartella `corsi/NN-slug/` con presentazione, scaletta e laboratorio.
- **Presentazione**: il file `presentazione/index.html` di un corso, autonomo e interattivo.
- **Scaletta**: le tappe del corso, con la durata indicativa e cosa preparare prima.
- **Laboratorio** (lab): la parte pratica di un corso. I suoi file stanno in `lab/` come file veri.
- **Tappa**: un capitolo della presentazione.

## Agenti e personalizzazione

- **Agente di coding**: uno strumento come Claude Code o GitHub Copilot che legge il repo, esegue comandi e modifica file.
- **Istruzioni di progetto**: regole sempre valide, caricate a ogni sessione: `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`.
- **Skill**: una cartella con un file `SKILL.md` che l'agente carica solo quando serve. Il formato segue lo standard aperto Agent Skills.
- **Frontmatter**: il blocco YAML in cima a `SKILL.md`. `name` e `description` sono i campi comuni a tutti gli strumenti.
- **Description**: il campo che dice che cosa fa una skill e quando usarla. Il modello la legge per decidere se attivarla.
- **Progressive disclosure**: il caricamento a strati delle skill. Prima `name` e `description`, poi il corpo, poi i file di supporto se servono.
- **Skill user-invoked**: la avvia la persona con `/nome`. Si ottiene con `disable-model-invocation: true`.
- **Skill model-invoked**: la attiva il modello in base alla description. Con `user-invocable: false` sparisce dal menu `/`.
- **Subagente**: un agente con prompt e strumenti propri e un contesto separato, a cui l'agente principale delega un lavoro. In Copilot si chiama *custom agent* (file `.agent.md`).
- **Hook**: un comando eseguito automaticamente su un evento dell'agente, per esempio dopo una modifica a un file.
- **Server MCP**: un processo che espone all'agente strumenti esterni (issue tracker, database, browser) tramite il Model Context Protocol.
- **Harness**: in VS Code, il motore che esegue l'agente (Local, Copilot, Claude). Determina quali cartelle di skill vengono lette.

## Distribuzione

- **Plugin**: un pacchetto installabile che porta skill, subagenti, hook e server MCP. Ha un manifest e una versione.
- **Manifest**: il file `plugin.json` che descrive un plugin. Per Claude Code sta in `.claude-plugin/plugin.json`, ed è letto anche da Copilot.
- **Marketplace**: un catalogo di plugin in un repo git, descritto da `marketplace.json`.
- **Id di installazione**: `nome-plugin@nome-marketplace`, per esempio `team-toolkit@courses-ai`.
- **Marketplace predefinito**: quello già registrato al primo avvio: `claude-plugins-official` in Claude Code, `awesome-copilot` in Copilot.

## Heimdall

- **Heimdall**: il plugin che i laboratori costruiscono dalla lezione 04. Parte da un alert di sicurezza e arriva a una pull request da rivedere.
- **Alert normalizzato**: un alert di AppScan o SonarQube nello schema comune di Heimdall, con un id stabile come `PAY-160644`.
- **Pertinenza**: il giudizio del Security Analyst su un alert. È pertinente se il problema c'è ed è raggiungibile con un input esterno; pertinente ma non sfruttabile oggi se nessuna catena porta un input esterno; non pertinente se il problema non c'è.
- **Punto d'ingresso**: un metodo da cui parte l'esecuzione: un endpoint HTTP, un filtro, l'avvio, un job pianificato, un `main`. I test sono punti d'ingresso a parte.
- **Catena**: la sequenza di chiamate da un punto d'ingresso al codice di un alert, con file e riga di ogni passo.
- **Albero sintattico** (AST): la struttura di un file sorgente come la vede un parser: tipi, metodi, chiamate. Commenti e stringhe ne restano fuori.
- **Remediation Plan**: il piano di correzione di un alert, in `.pipeline/<ID>/plan-vN.md`. Lo scrive il Security Analyst e lo valuta il Supervisor.
- **Vincolo di progetto**: una regola che ogni piano deve rispettare in un progetto, per esempio «Java 8». Sta in `.heimdall/vincoli.md` nel repo del progetto, con un nome in grassetto, e la scrive il team che lo mantiene (ADR-0008).
- **Verdetto**: la decisione del Supervisor su un piano, in `.pipeline/<ID>/verdict-vN.json`: approvato, oppure rifiutato con le violazioni. Elenca in `checked` tutti i vincoli controllati.
- **Violazione**: un punto del piano che contraddice un vincolo scritto. Un gusto o un'alternativa preferita non sono violazioni.
- **Guardrail**: un hook che impedisce un'azione dell'agente invece di chiedergli di evitarla. In Heimdall: il contratto degli artefatti, i test esistenti intoccabili, niente merge.
- **Branch protetto**: un branch su cui Heimdall non fa commit, push o merge: `main`, `master`, `develop`, `release/*`.

## Documentazione delle decisioni

- **ADR** (Architecture Decision Record): un file in `docs/adr/` che fissa una decisione e il suo perché.
