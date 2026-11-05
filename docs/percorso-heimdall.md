# Percorso Heimdall

Il percorso porta a mettere in funzione **Heimdall**: un plugin per GitHub Copilot CLI e Claude Code che parte da un alert di sicurezza (AppScan o SonarQube) e arriva a una pull request su Azure DevOps, pronta per la review umana. Le prime lezioni insegnano gli strumenti con cui è costruito, le successive lo costruiscono un pezzo alla volta, l'ultima lo usa.

Decisioni di riferimento: [ADR-0003](adr/0003-il-percorso-porta-a-heimdall-che-vive-in-un-repo-separato.md) (entrambi gli strumenti), [ADR-0004](adr/0004-nei-corsi-heimdall-usa-un-ambiente-simulato.md) (ambiente simulato), [ADR-0005](adr/0005-per-ora-heimdall-si-costruisce-da-zero-nei-laboratori-di-questo-repo.md) (Heimdall si costruisce da zero in questo repo) [ADR-0006](adr/0006-il-backend-reale-di-heimdall-chiama-le-api-rest-degli-scanner.md) (il backend reale chiama le API REST degli scanner) e [ADR-0007](adr/0007-ogni-lezione-tiene-nel-suo-lab-il-plugin-heimdall-completo.md) (ogni lezione tiene una copia completa del plugin).

## Che cosa fa Heimdall

Dalla demo della Fase 1:

```
/heimdall remediate --project payments-api

Data Retriever ─▶ Selezione ─▶ Security Analyst ─▶ Supervisor ─▶ Resolver ─▶ CI/CD ─▶ Review umana
  alert dagli       priorità      pertinenza,          vincoli,       branch,      build e    decide lo
  scanner, schema   per gravità   AST, piano di        perimetro,     commit, PR   test       sviluppatore
  comune                          remediation          approva o      su Azure     (max 2
                                       ▲               rifiuta        DevOps       retry)
                                       └── piano rifiutato ┘               ▲          │
                                                                           └── CI fallita
```

Regole che valgono sempre:
- Heimdall non modifica i test.
- Non fa merge: l'esito è sempre una pull request da rivedere.
- Ogni passo lascia una traccia leggibile, cioè la timeline della demo.

Gli scenari della demo sono tre, e diventano gli scenari del corso:

| Scenario | Progetto | Che cosa mette alla prova |
|----------|----------|---------------------------|
| Java 8 · Maven · AppScan | `payments-api` | Dipendenza vulnerabile; il Supervisor **rifiuta** il piano v1 (upgrade a Java 11) e approva il v2 |
| Spring Boot 3 · Java 21 · SonarQube | `orders-service` | SQL injection; percorso diretto, piano approvato al primo colpo |
| Angular 21 · npm · AppScan | `customer-portal-ui` | XSS; la **CI fallisce** e il Resolver corregge con un retry |

## Dove si impara ogni pezzo

| Pezzo di Heimdall | Strumento | Lezione |
|-------------------|-----------|---------|
| Il comando `/heimdall remediate` | skill in un plugin, marketplace | 01 |
| I quattro agenti con contesto separato | subagenti | 02, 03 |
| «Test non modificati», «niente merge» | hook `PreToolUse` | 02, 06 |
| Collegamento agli scanner e ad Azure DevOps | server MCP | 02, 04 |
| La pipeline con rifiuto e retry | orchestrazione | 03 |
| Analisi del codice e AST | graphify, analisi statica | 01, 05 |
| Scenari ripetibili | eval, mock, ambiente simulato | 02, 08 |

## Lezioni

Ogni lezione dura circa 3 ore e 30 minuti e ha la struttura di sempre: presentazione, scaletta, laboratorio (ADR-0001). La lezione 03 lavora ancora su `acme-shop`, con un plugin didattico in questo repo. Dalla lezione 04 il laboratorio costruisce Heimdall da zero, in questo repo: il plugin `heimdall`, un pezzo per lezione (ADR-0005). Ogni lezione parte dalla copia della lezione precedente e tiene nel suo `lab/` il plugin completo, com'è alla fine del laboratorio; il marketplace `courses-ai` pubblica quella dell'ultima lezione (ADR-0007). Per ora le lezioni non fanno riferimento al repo `heimdall`.

| # | Lezione | Pezzo di Heimdall | Laboratorio | Stato |
|---|---------|-------------------|-------------|-------|
| 01 | [Skill e plugin](../corsi/01-skill-e-plugin/scaletta.md) | La skill `/heimdall`, il plugin, il marketplace | `team-toolkit` | fatto |
| 02 | [Subagenti, hook e server MCP](../corsi/02-subagenti-hook-mcp/scaletta.md) | I mattoni: agenti, guard, connettori | `team-guardrails` | fatto |
| 03 | [Orchestrare più agenti](../corsi/03-orchestrare-agenti/scaletta.md) | La pipeline: chi chiama chi, quali artefatti si passano gli agenti (alert, piano, verdetto), i cicli di rifiuto e di retry | `team-pipeline`: Analyst e Supervisor su `acme-shop`, con un rifiuto e una rielaborazione | fatto |
| 04 | [Connettere i sistemi](../corsi/04-connettere-i-sistemi/scaletta.md) | Data Retriever e server MCP di Heimdall: lo schema comune degli alert, il backend simulato e quello reale, la configurazione delle credenziali | `heimdall` da zero: il Data Retriever produce la tabella degli alert normalizzati dei tre scenari | fatto |
| 05 | [Capire il codice](../corsi/05-capire-il-codice/scaletta.md) | Security Analyst: pertinenza dell'alert, AST e dipendenze, Remediation Plan | `heimdall` 0.2.0: `analyze.js` misura i fatti sul codice di `payments-api`, il Security Analyst scrive il piano v1 (acme-xml 2.0.0, quindi Java 11) | fatto |
| 06 | Vincoli e guardrail | Supervisor e hook: vincoli di progetto (per esempio la versione di Java), perimetro della modifica, test intoccabili, niente merge | Lo scenario Java 8: v1 rifiutato, v2 approvato | da fare |
| 07 | Dalla patch alla pull request | Resolver: branch, conventional commits, PR, lettura dei log della CI, retry | Lo scenario Angular: CI fallita, poi retry | da fare |
| 08 | Misurare e rendere affidabile | I tre scenari come casi di prova: `claude plugin eval` in Claude Code, esecuzione degli scenari in Copilot CLI; costi, tempi, timeline | La suite sui tre scenari, con il backend simulato | da fare |
| 09 | **Heimdall in funzione** | Installazione di `heimdall`, `/heimdall remediate` sui tre scenari, poi la configurazione del backend reale sulla propria macchina | Review delle PR prodotte; retrospettiva verso la Fase 2 | da fare |

## Ambiente simulato e accesso reale

Durante il corso Heimdall usa il backend simulato del suo server MCP. Gli scenari sono ripetibili e non servono permessi sui sistemi aziendali (ADR-0004). Dopo il corso ognuno configura il backend reale sulla propria macchina. Le credenziali stanno in variabili d'ambiente o in un file locale ignorato da git, mai in un repo.

Verificato nella lezione 04:
- per gli scanner il backend reale chiama le API REST: `api/issues/search` di SonarQube, `ApiKeyLogin` e `Issues/Application/{id}` di AppScan on Cloud (ADR-0006). Il server ufficiale `SonarSource/sonarqube-mcp-server` esiste ma non lo usiamo;
- la documentazione di HCL ha una pagina su un server MCP di AppScan on Cloud e AppScan 360°. Non siamo riusciti a leggerla: configurazione e strumenti restano da verificare;
- `microsoft/azure-devops-mcp` esiste, remoto o locale, con strumenti per repo, pull request, pipeline e log. Se usarlo per Azure DevOps si decide nella lezione 07.

Aggiunto nella lezione 05:
- lo strumento `get_component` del server MCP restituisce i metadati di una libreria: versioni, Java minimo, API rimosse. Il backend simulato li legge da `scenarios/<progetto>/components.json`; il backend reale non li ha ancora e lo dice con un errore;
- l'analisi del codice non passa dal server MCP: legge il progetto in locale, dalla cartella in cui si lavora, con un parser Java minimale scritto per il corso. I suoi limiti sono nel [laboratorio della lezione 05](../corsi/05-capire-il-codice/lab/README.md#i-limiti-del-parser).

Le impostazioni del backend reale: `HEIMDALL_BACKEND=real`, progetti e indirizzi in un file locale (`HEIMDALL_CONFIG`), credenziali in variabili d'ambiente. I dettagli sono nel [laboratorio della lezione 04](../corsi/04-connettere-i-sistemi/lab/README.md#il-backend-reale-fuori-dal-corso).

## Decisioni aperte

- **Chi orchestra la pipeline** (lezione 03). Le strade sono due:
  - la skill `/heimdall` guida l'agente principale, che delega ai subagenti;
  - uno script deterministico richiama l'agente a ogni fase, per esempio con la modalità non interattiva della CLI.

  La prima è più vicina alla demo. La seconda rende più affidabili i cicli (rifiuto, retry al massimo 2) e la timeline. La lezione 03 le confronta e il suo laboratorio usa una strada mista: la skill guida l'agente principale, che delega ai subagenti, mentre un hook fa rispettare il contratto degli artefatti e il limite dei tentativi. La scelta per Heimdall va in un ADR di questo repo (ADR-0005).
- **Da dove il backend reale legge i metadati delle librerie** (lezione 09): repository Maven aziendale, Maven Central o note di rilascio. Fino ad allora `get_component` funziona solo con il backend simulato.
- **Come si esegue la CI simulata** (lezione 07): esiti prestabiliti negli scenari, oppure build e test veri dei progetti di esempio. I secondi richiedono JDK 8, JDK 21, Gradle e Node.js su ogni macchina.
