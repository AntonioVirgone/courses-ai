# Il backend reale di Heimdall chiama le API REST degli scanner, non i loro server MCP ufficiali

Il server MCP di Heimdall ha due backend (ADR-0004). Quello reale legge gli alert chiamando direttamente le API REST degli scanner: `api/issues/search` di SonarQube e, per AppScan on Cloud, `api/v4/Account/ApiKeyLogin` seguita da `api/v4/Issues/Application/{id}`. Restituisce gli stessi dati grezzi del backend simulato, e il server li normalizza e li seleziona con lo stesso codice. Progetti e indirizzi stanno in un file locale fuori dal repo, indicato da `HEIMDALL_CONFIG`. Le credenziali stanno solo in variabili d'ambiente: `HEIMDALL_SONARQUBE_TOKEN`, `HEIMDALL_APPSCAN_KEY_ID`, `HEIMDALL_APPSCAN_KEY_SECRET`.

Lo decidiamo nella lezione 04, come prevedeva ADR-0004 (ADR-0005 sposta qui la decisione). I server MCP ufficiali esistono: `SonarSource/sonarqube-mcp-server` per SonarQube, e HCL documenta un server MCP per AppScan on Cloud e AppScan 360°. Usarli dietro il nostro server vorrebbe dire far parlare un server MCP con un altro. Servirebbe un client MCP dentro Heimdall e un secondo processo per scanner: quello di SonarQube si distribuisce come immagine Docker. In più, dovremmo tradurre gli strumenti di terzi nel nostro schema, e quelli cambiano con i loro rilasci. Due chiamate REST per scanner sono meno codice, si provano con un finto server in locale e non richiedono Docker sulle macchine del corso.

Diventa più facile provare il backend reale: lo script `fake-sonarqube.js` del laboratorio risponde come `api/issues/search`, con un token inventato. Diventa più difficile seguire le novità degli scanner: un campo nuovo dell'API va aggiunto a mano nel normalizzatore. La chiamata ad AppScan non è stata provata contro il servizio vero: va verificata nella lezione 09, con la prova sul backend reale. Per Azure DevOps la stessa scelta si fa nella lezione 07.

## Considered Options

- **I server MCP ufficiali dietro il server di Heimdall.** Scartato: un client MCP dentro il server, un processo in più per scanner e Docker per SonarQube; e la configurazione del server di AppScan non l'abbiamo potuta verificare.
- **Gli agenti collegati direttamente ai server MCP ufficiali.** Scartato già da ADR-0004: lega i prompt ai nomi degli strumenti di terzi.
- **Le credenziali nel file locale insieme ai progetti.** Scartato: il file si copia e si condivide facilmente. Le variabili d'ambiente restano sulla macchina e non finiscono in un commit per sbaglio.
- **`userConfig` del plugin, con i valori sensibili nel portachiavi.** Rimandato: esiste in Claude Code, ma Copilot CLI non documenta niente di simile, e Heimdall deve funzionare in tutti e due.
