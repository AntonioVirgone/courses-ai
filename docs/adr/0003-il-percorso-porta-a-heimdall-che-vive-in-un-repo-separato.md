> **Superata da ADR-0005** su dove vive il codice di Heimdall e da dove partono i laboratori. Il resto resta in vigore.

# Il percorso dei corsi porta a Heimdall, che vive in un repo separato

I corsi di questo repo formano un percorso. L'ultima lezione mette in funzione Heimdall, il plugin che parte da un alert di AppScan o SonarQube e arriva a una pull request su Azure DevOps pronta per la review umana. Le prime lezioni insegnano gli strumenti con cui è costruito: skill, plugin, subagenti, hook e server MCP. Le successive costruiscono Heimdall un pezzo alla volta. Il piano è in [docs/percorso-heimdall.md](../percorso-heimdall.md). Heimdall funziona sia in GitHub Copilot CLI sia in Claude Code.

Il codice di Heimdall vive nel repo separato `heimdall`, non qui. Heimdall non è un esempio didattico come `team-toolkit` e `team-guardrails` (ADR-0002): è uno strumento che il team userà sui propri progetti, con un ciclo di rilascio, una configurazione per macchina e accessi ai sistemi aziendali. Tenerlo in un repo proprio separa le sue versioni da quelle dei corsi. Evita anche di copiarne i file da una lezione all'altra: ogni lezione che lo costruisce ne completa un pezzo nel repo `heimdall`, e il suo laboratorio in `corsi/NN-slug/lab/` contiene esercizi, istruzioni e il riferimento allo stato del repo `heimdall` da cui partire e a cui arrivare.

Diventa più facile rilasciare e usare Heimdall indipendentemente dai corsi, e seguire una lezione partendo da uno stato noto del codice. Diventa più difficile tenere allineati due repo: quando una lezione cambia, va controllato che il riferimento allo stato di `heimdall` sia ancora valido. I plugin didattici dei corsi 01 e 02 restano qui, nel marketplace `courses-ai`.

## Considered Options

- **Heimdall dentro `courses-ai`, come plugin del marketplace.** Scartato: mescola uno strumento di lavoro con il materiale didattico, e ogni lezione dovrebbe copiare o modificare lo stesso plugin.
- **Una copia completa di Heimdall nel laboratorio di ogni lezione.** Scartato: le copie si disallineano alla prima correzione.
- **Solo Copilot CLI, come nella demo.** Scartato: il team usa entrambi gli strumenti, e le eval di `claude plugin eval` esistono solo per Claude Code.
