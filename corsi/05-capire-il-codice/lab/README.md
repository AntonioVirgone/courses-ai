# Laboratorio · heimdall, il Security Analyst

Il secondo pezzo di Heimdall legge il codice. Un alert dice che cosa ha trovato lo scanner; il Security Analyst decide se riguarda davvero il progetto e scrive il primo piano di correzione. Il lavoro è diviso in due:
- un programma, `analyze.js`, misura i fatti sul codice: dipendenza e righe del `pom.xml`, usi della libreria, catene dai punti d'ingresso, test, costo dell'aggiornamento;
- il subagente `security-analyst` li verifica leggendo il codice, giudica la pertinenza e scrive il Remediation Plan v1.

Il progetto è `payments-api`, lo scenario Java 8 della demo, con l'alert `PAY-160644` della lezione 04. Le slide del laboratorio partono dalla 17 della [presentazione](../presentazione/index.html#s17). I dati sono inventati (ADR-0004).

| Cartella | Che cos'è |
|----------|-----------|
| [`payments-api/`](payments-api/) | Il progetto di esempio: Spring Boot 2.7, Java 8, Maven. Lo riprendono le lezioni successive |
| [`esempi/PAY-160644/`](esempi/PAY-160644/) | Un giro già fatto: `alert.json`, `analysis.json` e un `plan-v1.md` di riferimento |
| [`team-marketplace/`](team-marketplace/) | La soluzione: il plugin `heimdall` com'è alla fine di questo laboratorio (ADR-0007) |

Il plugin parte da quello della [lezione 04](../../04-connettere-i-sistemi/lab/) e aggiunge:

| Componente | File | Che cosa fa |
|------------|------|-------------|
| Metadati delle librerie | `scenarios/payments-api/components.json`, strumento `get_component` | Versioni di una libreria, Java minimo, novità e API rimosse. Il backend simulato le legge dallo scenario; il reale non le ha ancora |
| Parser Java | `analysis/java.js` | Dal testo a un albero: package, import, tipi, metodi, chiamate con la riga. Commenti e stringhe restano fuori |
| Lettore del pom | `analysis/pom.js` | Dipendenze dichiarate, proprietà e versione di Java, con le righe |
| Analisi | `analysis/index.js` | Risolve i nomi, costruisce il grafo delle chiamate, trova i punti d'ingresso e le catene fino al codice dell'alert |
| Script | `scripts/analyze.js`, `scripts/java-outline.js` | Il primo scrive `.pipeline/<ID>/analysis.json` e ne stampa il riassunto; il secondo mostra l'albero di un file |
| Subagente `security-analyst` | `agents/security-analyst.md` | Solo `Read`, `Grep` e `Glob`: verifica i fatti, giudica la pertinenza, restituisce il piano v1 |
| Skill `analyze-alert` | `skills/analyze-alert/SKILL.md` | Lancia l'analisi, delega al `security-analyst`, salva `plan-v1.md` |

Cambiano anche `retrieve-alerts`, che alla fine propone `analyze-alert`, il server MCP, che ha un quinto strumento, e `version` in `plugin.json`, che passa a 0.2.0.

## Il contratto, con un artefatto in più

```
.pipeline/PAY-160644/
├── alert.json       save-alert.js, dal server MCP (lezione 04)
├── analysis.json    analyze.js: i fatti misurati sul codice
└── plan-v1.md       security-analyst, tramite la skill
```

- `analysis.json` lo scrive un programma, come `alert.json`: righe, versioni e catene non passano dal testo del modello.
- Come ogni artefatto, non si riscrive: `analyze.js` esce con 3 se c'è già.
- `plan-v1.md` ha il formato del corso 03, con quattro sezioni in più: «Pertinenza», «Evidenze», «Test» e «Alternative». L'hook `guard-pipeline` del corso 03 lo accetta.

## Prima di iniziare

Dalla radice di questo repo:

```bash
export H="$PWD/corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall"
```

```bash
export L="$PWD/corsi/05-capire-il-codice/lab"
```

Si parte da dove finisce la lezione 04: il plugin in `~/heimdall-lab/heimdall`, installato da `heimdall-lab`, e l'alert in `~/heimdall-lab/payments-api/.pipeline/PAY-160644/alert.json`. Se non hai fatto la lezione 04, parti dalla sua soluzione:

```bash
mkdir -p ~/heimdall-lab/.claude-plugin && cp -r corsi/04-connettere-i-sistemi/lab/team-marketplace/plugins/heimdall ~/heimdall-lab/
```

```bash
printf '%s\n' '{"name":"heimdall-lab","owner":{"name":"io"},"plugins":[{"name":"heimdall","source":"./heimdall"}]}' > ~/heimdall-lab/.claude-plugin/marketplace.json
```

```bash
claude plugin marketplace add ~/heimdall-lab && claude plugin install heimdall@heimdall-lab
```

```bash
mkdir -p ~/heimdall-lab/payments-api && (cd ~/heimdall-lab/payments-api && node ~/heimdall-lab/heimdall/scripts/save-alert.js payments-api PAY-160644)
```

Se hai installato `heimdall@courses-ai`, disinstallalo per la durata del laboratorio: due plugin con lo stesso nome si confondono.

## Passi

1. **Il codice di payments-api** (slide 18). Il progetto entra nella cartella che ha già l'alert:

   ```bash
   cp -r "$L/payments-api/." ~/heimdall-lab/payments-api/ && cd ~/heimdall-lab/payments-api
   ```

   ```bash
   git init && git add pom.xml src README.md .gitignore && git commit -m "chore: payments-api di partenza"
   ```

   Apri `pom.xml`: la dipendenza segnalata è alle righe 46–50, ma la versione sta nella proprietà della riga 22. La riga 21 dice Java 1.8. Poi cerca la libreria con grep:

   ```bash
   grep -rn "Xml[A-Z]" src/main/java
   ```

   Sono 18 righe. Quali sono codice, e quali no?

2. **L'albero di un file** (slide 19). Il parser e lo script che lo mostra:

   ```bash
   cp -r "$H/analysis" ~/heimdall-lab/heimdall/ && cp "$H/scripts/java-outline.js" ~/heimdall-lab/heimdall/scripts/
   ```

   ```bash
   node ~/heimdall-lab/heimdall/scripts/java-outline.js src/main/java/com/acme/payments/statements/StatementParser.java
   ```

   Ogni chiamata ha la riga e il tipo che la riceve: `reader.read()` va a `com.acme.xml.XmlReader`, `toLine()` a un metodo del progetto. Prova anche `StatementController.java`: `upload` è un punto d'ingresso, `POST /api/statements`, e `?.body()` è una chiamata in catena di cui il parser non conosce il tipo. Le due righe di grep che non compaiono nell'albero sono un commento e una stringa.

3. **I metadati della libreria** (slide 20). Da `~/heimdall-lab/heimdall`, il server MCP con il quinto strumento e il manifest con la versione 0.2.0:

   ```bash
   cd ~/heimdall-lab/heimdall && cp "$H"/mcp/{server.js,connector.js} mcp/ && cp "$H"/mcp/backends/*.js mcp/backends/
   ```

   ```bash
   cp "$H/.claude-plugin/plugin.json" .claude-plugin/
   ```

   ```bash
   cp "$H/scenarios/payments-api/components.json" scenarios/payments-api/
   ```

   ```bash
   node scripts/mcp-call.js get_component '{"project":"payments-api","name":"com.acme.libs:acme-xml"}'
   ```

   Tre versioni: la 1.3.0 aggiunge `resolveExternalEntities(boolean)`, la 1.4.2 è l'ultima della linea 1.x, la 2.0.0 corregge l'alert, toglie `XmlReaderFactory` e richiede Java 11. Prova lo stesso strumento con `HEIMDALL_BACKEND=real`: risponde che nel backend reale non c'è ancora, invece di inventare.

4. **L'analisi** (slide 21). Lo script, poi da `~/heimdall-lab/payments-api`:

   ```bash
   cp "$H/scripts/analyze.js" scripts/ && cd ~/heimdall-lab/payments-api
   ```

   ```bash
   node ~/heimdall-lab/heimdall/scripts/analyze.js PAY-160644; echo "exit=$?"
   ```

   Il riassunto deve dire:
   - nessuna versione corretta compatibile con Java 1.8;
   - 14 chiamate alla libreria in 3 metodi;
   - due catene: `POST /api/statements` fino a `StatementParser#parse`, e `BankCodesLoader#load` all'avvio;
   - 2 test che passano da `parse`;
   - `XmlReaderFactory` usato in due file.

   Rilancialo: deve uscire con 3. Confronta il file con quello di riferimento: `diff .pipeline/PAY-160644/analysis.json "$L/esempi/PAY-160644/analysis.json"` non deve stampare niente.

   Poi rompi la catena. In `StatementController.java`, riga 34, togli la chiamata: `Statement statement = null; // importService.importStatement(in);`. Rilancia con `--no-save`, che stampa e non salva:

   ```bash
   node ~/heimdall-lab/heimdall/scripts/analyze.js PAY-160644 --no-save
   ```

   Resta solo la catena dell'avvio, e `StatementParser#parse` compare tra i non raggiunti. Rimetti il file com'era con `git checkout src`.

   Facoltativo, un alert sul codice invece che su una dipendenza:

   ```bash
   node ~/heimdall-lab/heimdall/scripts/save-alert.js payments-api PAY-195647 && node ~/heimdall-lab/heimdall/scripts/analyze.js PAY-195647
   ```

   La riga 31 di `SessionCookieFilter.java` si raggiunge da ogni richiesta HTTP. Per i test l'analisi dice «nessuno», eppure `SessionCookieFilterTest` esiste: perché il parser non lo vede?

5. **Il Security Analyst nel plugin** (slide 22). Da `~/heimdall-lab/heimdall`, il subagente e le due skill:

   ```bash
   cd ~/heimdall-lab/heimdall && cp "$H/agents/security-analyst.md" agents/ && cp -r "$H/skills/analyze-alert" skills/
   ```

   ```bash
   cp "$H/skills/retrieve-alerts/SKILL.md" skills/retrieve-alerts/
   ```

   ```bash
   claude plugin validate ~/heimdall-lab && claude plugin marketplace update heimdall-lab && claude plugin update heimdall@heimdall-lab
   ```

   ```bash
   claude plugin details heimdall
   ```

   Deve dire `heimdall 0.2.0` ed elencare 2 skill, 2 agenti e 1 server MCP. In Copilot CLI aggiorna il marketplace e reinstalla il plugin:

   ```bash
   copilot plugin marketplace update heimdall-lab && copilot plugin install heimdall@heimdall-lab
   ```

6. **Il piano v1** (slide 23). Da `~/heimdall-lab/payments-api`, in Claude Code:

   ```
   /heimdall:analyze-alert PAY-160644
   ```

   In Copilot CLI: `/analyze-alert PAY-160644`. La skill trova l'analisi già fatta (uscita 3) e la usa. Approva la scrittura di `.pipeline/PAY-160644/plan-v1.md`. Confronta il piano con [`esempi/PAY-160644/plan-v1.md`](esempi/PAY-160644/plan-v1.md):
   - la pertinenza cita la catena da `POST /api/statements` e dice perché `BankCodesLoader` non è sfruttabile;
   - Java da 1.8 a 11 compare in «Modifiche», «Dipendenze» e «Rischi»;
   - i file toccati sono `pom.xml`, `StatementParser.java`, `BankCodesLoader.java` e un test nuovo;
   - i test esistenti non cambiano;
   - tra le alternative c'è `resolveExternalEntities(false)` sulla 1.4.2.

   Se un riferimento `file:riga` del piano non torna con il codice, ha ragione il codice. Il piano non è approvato da nessuno: il Supervisor arriva nella lezione 06.

I passi 5 e 6 con l'agente consumano token sul tuo account.

## Installare la soluzione senza fare il laboratorio

Dal marketplace del repo, che dalla lezione 05 punta a questa copia del plugin (ADR-0007):

```bash
claude plugin install heimdall@courses-ai
```

```bash
copilot plugin install heimdall@courses-ai
```

Oppure dalla radice di questo repo, senza installare:

```bash
claude --plugin-dir ./corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall
```

Che cosa aggiunge questa lezione rispetto alla 04:

```bash
diff -r corsi/04-connettere-i-sistemi/lab/team-marketplace/plugins/heimdall corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall
```

## I limiti del parser

`analysis/java.js` è un parser minimale scritto per il corso: niente dipendenze, poche centinaia di righe da leggere. Costruisce l'albero delle dichiarazioni e delle chiamate, ma non è un compilatore:
- non conosce i tipi di ritorno, quindi una chiamata in catena come `a().b()` resta senza tipo;
- non distingue gli overload: due metodi con lo stesso nome sono lo stesso nodo;
- non vede le chiamate che passano da una libreria o da un framework, come Spring che chiama `doFilterInternal` o un metodo chiamato per riflessione;
- non segue i dati: dice che un metodo si raggiunge da un endpoint, non da dove viene un argomento.

Per questo il Security Analyst verifica nel codice ogni fatto che usa. Su un progetto vero servono strumenti completi: JavaParser con il suo symbol solver, tree-sitter (che usa graphify, corso 01), oppure l'analisi del compilatore. Per le dipendenze transitive serve Maven, con `mvn dependency:tree`.

## Che cosa è verificato

Durante la preparazione del corso:

- **Claude Code 2.1.318:**
  - `claude plugin validate` passa sul plugin e sul marketplace;
  - `claude plugin details heimdall` dice `heimdall 0.2.0` ed elenca 2 skill, 2 agenti e 1 server MCP;
  - `claude mcp list` mostra `plugin:heimdall:heimdall` connesso.
- **Il server MCP:** `get_component` provato a mano, con un componente sconosciuto e con il backend reale. Le risposte sono errori dello strumento, il server non cade.
- **`analyze.js`:**
  - su `PAY-160644` produce l'`analysis.json` di `esempi/`, poi esce con 3 al secondo tentativo;
  - con `--no-save` e la chiamata tolta da `StatementController.java` perde la catena HTTP;
  - su `PAY-195647` trova la catena del filtro.
- **Il parser:** provato sui file di `payments-api` e su un file con generici, lambda, classi anonime ed enum. Lo stesso conteggio di grep: 18 righe, di cui 16 codice.
- **`payments-api`:** `javac --release 8` sui sorgenti segnala solo simboli mancanti (Spring, JUnit e acme-xml non ci sono), nessun errore di sintassi.
- **`esempi/PAY-160644/plan-v1.md`:** l'hook `guard-pipeline` del corso 03 lo accetta come piano v1.

Non verificato:

- in Claude Code e in Copilot, una sessione vera con il modello: la delega al `security-analyst`, il giudizio di pertinenza, il piano;
- in Copilot CLI: `copilot plugin marketplace update` su un marketplace locale e la reinstallazione con la versione nuova. Non siamo riusciti a leggere la documentazione di GitHub durante la preparazione;
- che `payments-api` si compili e i suoi test passino: acme-xml è inventata e non esiste in nessun repository Maven;
- `get_component` nel backend reale: non c'è. Da dove leggere i metadati delle librerie si decide più avanti;
- VS Code.
