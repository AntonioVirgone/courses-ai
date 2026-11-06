# Laboratorio · heimdall

Da questa lezione si costruisce Heimdall da zero, un pezzo alla volta (ADR-0005). Il primo pezzo collega gli agenti agli scanner:
- un server MCP con quattro strumenti stabili, che restituisce gli alert di AppScan e SonarQube in uno schema comune;
- dietro il server, due backend intercambiabili: simulato, sugli scenari preparati, e reale, sulle API degli scanner;
- il subagente `data-retriever`, che legge gli alert solo da quel server e produce la tabella dei tre scenari.

Le slide del laboratorio partono dalla 17 della [presentazione](../presentazione/index.html#s17). I dati degli scenari sono inventati (ADR-0004).

| Cartella | Che cos'è |
|----------|-----------|
| [`team-marketplace/`](team-marketplace/) | La soluzione: il marketplace con il plugin `heimdall` come alla fine del laboratorio |

I componenti del plugin:

| Componente | File | Che cosa fa |
|------------|------|-------------|
| Scenari | `scenarios/<progetto>/` | `project.json` e l'export dello scanner dei tre progetti: `payments-api` e `customer-portal-ui` con AppScan, `orders-service` con SonarQube |
| Schema comune | `mcp/alert.schema.json`, `mcp/schema.js` | La forma di ogni alert, e un validatore minimo |
| Normalizzatore | `mcp/alerts.js` | Traduce AppScan e SonarQube nello schema comune; scarta chiusi, duplicati e problemi non di sicurezza; dà a ogni alert un id stabile |
| Connettore | `mcp/connector.js`, `mcp/config.js` | Sceglie il backend con `HEIMDALL_BACKEND` e mette insieme backend e normalizzatore |
| Backend | `mcp/backends/simulated.js`, `mcp/backends/real.js` | Il simulato legge gli scenari; il reale chiama le API REST degli scanner (ADR-0006) |
| Server MCP `heimdall` | `.mcp.json`, `mcp/server.js` | Strumenti `list_projects`, `list_alerts`, `get_alert`, `backend_status` |
| Subagente `data-retriever` | `agents/data-retriever.md` | Ha solo gli strumenti del server: legge gli alert e restituisce la tabella |
| Skill `retrieve-alerts` | `skills/retrieve-alerts/SKILL.md` | Delega la lettura al `data-retriever`, poi salva l'alert scelto per la pipeline |
| Script | `scripts/` | `alerts-table.js` (la tabella senza il modello), `mcp-call.js` (un client MCP minimo), `save-alert.js` (l'alert in `.pipeline/`), `fake-sonarqube.js` (un finto SonarQube in locale) |
| Esempio di configurazione | `config.example.json` | Progetti e indirizzi per il backend reale. Niente credenziali |

Gli script sono in Node.js e non hanno dipendenze.

## Lo schema comune

Ogni alert esce dal server così, qualunque sia lo scanner:

```json
{
  "id": "PAY-160644",
  "project": "payments-api",
  "source": "appscan",
  "scannerId": "6b1f0c2e-8a4d-4f7e-9c11-2d5e7a90b301",
  "kind": "dependency",
  "rule": "Vulnerable Component",
  "severity": "high",
  "title": "Vulnerable Component: com.acme.libs:acme-xml 1.4.2",
  "cwe": "CWE-611",
  "location": { "file": "pom.xml", "line": 48 },
  "component": { "name": "com.acme.libs:acme-xml", "version": "1.4.2", "fixedIn": "2.0.0" },
  "description": "acme-xml 1.4.2 resolves external entities when it parses XML documents. …",
  "suggestedFix": "Upgrade com.acme.libs:acme-xml to version 2.0.0 or later.",
  "detectedAt": "2026-10-27T15:02:11.000Z"
}
```

- `id`, `source`, `rule`, `severity`, `title`, `location`, `description` e `suggestedFix` sono i campi dell'`alert.json` del corso 03: la pipeline di quel corso legge gli alert di Heimdall senza modifiche.
- L'`id` è la chiave del progetto e un numero ricavato da che cosa segnala l'alert: scanner, regola, file, riga, libreria. Lo stesso problema ha lo stesso id a ogni lettura, anche da due scansioni diverse, ed è così che si riconoscono i duplicati.
- `cwe`, `component` e `suggestedFix` possono essere `null`. SonarQube non restituisce la correzione nell'issue, e la CWE la ricaviamo dalla regola.
- Il server valida ogni alert contro lo schema prima di restituirlo: un alert fuori schema è un errore, non un dato.

## Prima di iniziare

Dalla radice di questo repo:

```bash
export H="$PWD/corsi/04-connettere-i-sistemi/lab/team-marketplace/plugins/heimdall"
```

```bash
mkdir -p ~/heimdall-lab/heimdall && cd ~/heimdall-lab/heimdall && git init
```

Se hai installato `heimdall@courses-ai`, disinstallalo per la durata del laboratorio: due plugin con lo stesso nome si confondono.

## Passi

Ogni passo aggiunge al plugin in `~/heimdall-lab/heimdall` i file della soluzione. Leggili mentre li copi: le slide spiegano perché sono fatti così.

1. **Lo scheletro e gli scenari** (slide 18). Il manifest e i dati degli scanner:

   ```bash
   mkdir -p .claude-plugin && cp "$H/.claude-plugin/plugin.json" .claude-plugin/
   ```

   ```bash
   cp -r "$H/scenarios" .
   ```

   Apri `scenarios/payments-api/appscan-issues.json` e `scenarios/orders-service/sonarqube-issues.json`: stesso tipo di informazione, nomi e valori diversi. Conta gli alert grezzi: sono 10 in tutto.

2. **Lo schema e il normalizzatore** (slide 19). Prima il contratto, poi la traduzione:

   ```bash
   mkdir -p mcp/backends scripts && cp "$H"/mcp/{alert.schema.json,schema.js,alerts.js,config.js,connector.js} mcp/
   ```

   ```bash
   cp "$H"/mcp/backends/*.js mcp/backends/ && cp "$H/scripts/alerts-table.js" scripts/
   ```

   ```bash
   node scripts/alerts-table.js
   ```

   Deve elencare 6 alert, dal `critical` di `orders-service` al `low` di `payments-api`, e 4 scartati: 2 chiusi, 1 duplicato, 1 non di sicurezza. Trova nei file grezzi quali sono e perché.

   Poi rompi il contratto: in `mcp/alerts.js` cambia `High: "high"` in `High: "alta"` e rilancia. Al posto degli alert di `payments-api` e `customer-portal-ui` devono comparire gli errori dello schema su `severity`, e lo script deve uscire con 1. Rimetti `"high"`.

3. **Il server MCP, a mano** (slide 20):

   ```bash
   cp "$H/mcp/server.js" mcp/ && cp "$H/scripts/mcp-call.js" scripts/
   ```

   Il protocollo, una riga JSON per messaggio:

   ```bash
   printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"prova","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node mcp/server.js
   ```

   Lo stesso con il client minimo, che fa la stretta di mano e chiama uno strumento:

   ```bash
   node scripts/mcp-call.js list_alerts '{"project":"payments-api","min_severity":"high"}'
   ```

   Deve restituire 1 alert, `PAY-160644`, con 1 chiuso e 1 sotto soglia tra gli scartati. Prova anche `get_alert` con un id che non esiste: la risposta è un errore dello strumento, non un crash del server.

4. **Il plugin e il Data Retriever** (slide 21). Il server dentro il plugin, il subagente e la skill:

   ```bash
   cp "$H/.mcp.json" . && cp -r "$H/agents" "$H/skills" . && cp "$H/scripts/save-alert.js" scripts/
   ```

   Un marketplace locale per installarlo:

   ```bash
   mkdir -p ~/heimdall-lab/.claude-plugin && printf '%s\n' '{"name":"heimdall-lab","owner":{"name":"io"},"plugins":[{"name":"heimdall","source":"./heimdall"}]}' > ~/heimdall-lab/.claude-plugin/marketplace.json
   ```

   ```bash
   claude plugin validate ~/heimdall-lab && claude plugin marketplace add ~/heimdall-lab && claude plugin install heimdall@heimdall-lab
   ```

   ```bash
   claude plugin details heimdall && claude mcp list
   ```

   Deve elencare 1 skill, 1 agente, 1 server MCP, e `plugin:heimdall:heimdall` connesso. In Copilot CLI, con il percorso assoluto:

   ```bash
   copilot plugin marketplace add "$HOME/heimdall-lab" && copilot plugin install heimdall@heimdall-lab
   ```

   ```bash
   copilot mcp list
   ```

   Poi, da `~/heimdall-lab`, in Claude Code:

   ```
   /heimdall:retrieve-alerts tutti
   ```

   In Copilot CLI: `/retrieve-alerts tutti`. Quando la skill chiede quale alert prendere in carico, rispondi «nessuno». Confronta la tabella con quella di `node heimdall/scripts/alerts-table.js`: deve coincidere riga per riga. Se non coincide, ha ragione lo script.

5. **Il backend reale, con un finto SonarQube** (slide 22). Da `~/heimdall-lab/heimdall`, l'esempio di configurazione e il finto server:

   ```bash
   cp "$H/config.example.json" . && cp "$H/scripts/fake-sonarqube.js" scripts/
   ```

   La configurazione vera sta fuori dal plugin e da ogni repo:

   ```bash
   cp config.example.json ~/heimdall-lab/config.json
   ```

   In un secondo terminale, da `~/heimdall-lab/heimdall`:

   ```bash
   FAKE_SONARQUBE_TOKEN=token-inventato node scripts/fake-sonarqube.js
   ```

   Nel primo terminale, da `~/heimdall-lab/heimdall`:

   ```bash
   export HEIMDALL_BACKEND=real HEIMDALL_CONFIG="$HOME/heimdall-lab/config.json"
   ```

   ```bash
   node scripts/mcp-call.js backend_status
   ```

   Deve elencare le variabili che mancano, tra cui `HEIMDALL_SONARQUBE_TOKEN`, senza mostrare valori. Poi:

   ```bash
   HEIMDALL_SONARQUBE_TOKEN=token-inventato node scripts/alerts-table.js orders-service
   ```

   Gli id devono essere gli stessi del backend simulato: cambia da dove arrivano i dati, non che cosa diventano. Prova anche un token sbagliato (accesso negato) e il finto server spento (non raggiungibile). Per l'agente, avvia `claude` o `copilot` nello stesso terminale, con la variabile del token esportata: il server MCP riceve le variabili tramite `.mcp.json`. Alla fine togli le variabili con `unset HEIMDALL_BACKEND HEIMDALL_CONFIG HEIMDALL_SONARQUBE_TOKEN`.

6. **Dall'alert alla pipeline** (slide 23). Il progetto che riceverà la correzione, per ora una cartella vuota:

   ```bash
   mkdir -p ~/heimdall-lab/payments-api && cd ~/heimdall-lab/payments-api
   ```

   In Claude Code: `/heimdall:retrieve-alerts payments-api`, e scegli `PAY-160644`. La skill lancia `save-alert.js`, che scrive `.pipeline/PAY-160644/alert.json`. In Copilot CLI lancia lo script a mano:

   ```bash
   node ~/heimdall-lab/heimdall/scripts/save-alert.js payments-api PAY-160644; echo "exit=$?"
   ```

   Rilancialo: deve uscire con 3, perché l'alert è già in carico. Il codice di `payments-api` arriva nella lezione 05, con il Security Analyst.

I passi 4, 5 e 6 con l'agente consumano token sul tuo account.

## Installare la soluzione senza fare il laboratorio

Dal marketplace del repo. Dalla lezione 05 `heimdall@courses-ai` è il plugin dell'ultima lezione fatta (ADR-0007): per avere esattamente quello di questa lezione usa `--plugin-dir`, più sotto.

```bash
claude plugin install heimdall@courses-ai
```

```bash
copilot plugin install heimdall@courses-ai
```

Oppure dalla radice di questo repo, senza installare:

```bash
claude --plugin-dir ./corsi/04-connettere-i-sistemi/lab/team-marketplace/plugins/heimdall
```

## Il backend reale fuori dal corso

Dopo il corso ognuno configura il backend reale sulla propria macchina (ADR-0004, ADR-0006):

| Che cosa | Dove | Esempio |
|----------|------|---------|
| Il backend | variabile `HEIMDALL_BACKEND` | `real` |
| Progetti e indirizzi degli scanner | file locale, `~/.config/heimdall/config.json` o il percorso in `HEIMDALL_CONFIG` | `config.example.json` |
| Token di SonarQube | variabile `HEIMDALL_SONARQUBE_TOKEN` | un token utente con il permesso Browse sul progetto |
| Chiave di AppScan on Cloud | variabili `HEIMDALL_APPSCAN_KEY_ID` e `HEIMDALL_APPSCAN_KEY_SECRET` | la chiave API dell'account |

Nessuno di questi valori va in un repo, in un prompt o in un messaggio dell'agente. `backend_status` dice che cosa manca e non mostra mai un valore.

## Che cosa è verificato

Durante la preparazione del corso:

- **Claude Code 2.1.318:**
  - `claude plugin validate` passa sul plugin e sul marketplace;
  - `claude plugin details heimdall` elenca 1 skill, 1 agente e 1 server MCP;
  - `claude mcp list` mostra `plugin:heimdall:heimdall` connesso.
- **Il server MCP:** `initialize`, `tools/list` e `tools/call` provati a mano, con risposte di errore per un progetto o un id sconosciuti e per un backend non valido.
- **Il normalizzatore:** sui tre scenari restituisce 6 alert validi e ne scarta 4: 2 chiusi, 1 duplicato, 1 non di sicurezza. `min_severity` scarta quelli sotto soglia.
- **Il backend reale, lato SonarQube:** provato contro `fake-sonarqube.js`, con il token giusto, con un token sbagliato e con il server spento. Restituisce gli stessi id del backend simulato.
- **`save-alert.js`:** scrive l'alert, poi esce con 3 al secondo tentativo. L'hook `guard-pipeline` del corso 03 riconosce la cartella `.pipeline/PAY-160644/`.
- **I nomi verificati sulla documentazione:** `.mcp.json` alla radice del plugin, `${CLAUDE_PLUGIN_ROOT}`, l'espansione `${VAR:-default}` nei campi `env`, e il nome degli strumenti dei plugin `mcp__plugin_<plugin>_<server>__<strumento>` in Claude Code; in Copilot CLI la lettura di `.mcp.json` nei plugin con il manifest in `.claude-plugin/`, l'espansione `${VAR:-default}` in `env` e `copilot mcp list`.

Non verificato:

- in Claude Code e in Copilot, una sessione vera con il modello: la delega al `data-retriever`, la tabella, il salvataggio dalla skill;
- in Copilot CLI: `${CLAUDE_PLUGIN_ROOT}` nel `.mcp.json` di un plugin (GitHub lo documenta solo nel frontmatter degli agenti) e il formato `heimdall/list_alerts` nel campo `tools` dell'agente;
- che il server MCP erediti le altre variabili d'ambiente della sessione: per questo `.mcp.json` le passa una per una;
- il backend reale contro un SonarQube vero, e la versione da cui SonarQube accetta il token come `Bearer`;
- il backend reale contro AppScan on Cloud. Accesso con `ApiKeyLogin` ed elenco con `Issues/Application/{id}` vengono dal codice ufficiale di HCL; la paginazione con `$top` e `$skip` e i campi `Cwe`, `LibraryName`, `LibraryVersion`, `FixedVersion` e `FixRecommendation` no. Sono i campi dell'export semplificato degli scenari. Si verifica nella lezione 09;
- VS Code.
