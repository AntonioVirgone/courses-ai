# Laboratorio · team-guardrails

Un subagente che rivede, un hook che protegge gli ADR e un server MCP che risponde con il glossario del progetto, raccolti nel plugin `team-guardrails`. Le slide del laboratorio partono dalla 19 della [presentazione](../presentazione/index.html#s19).

Il progetto su cui si lavora è `acme-shop` del corso 01: questo corso lo cita invece di copiarlo (ADR-0001).

| Cartella | Che cos'è |
|----------|-----------|
| [`team-marketplace/`](team-marketplace/) | La soluzione: il marketplace con il plugin `team-guardrails`, come alla fine del Passo 4 |
| [`../../01-skill-e-plugin/lab/acme-shop/`](../../01-skill-e-plugin/lab/acme-shop/) | Il progetto di esempio, dal corso 01 |

I componenti del plugin:

| Componente | File | Che cosa fa |
|------------|------|-------------|
| Subagente `reviewer` | `agents/reviewer.md` | Rivede un diff contro CLAUDE.md, glossario e ADR. Ha solo strumenti di lettura |
| Hook `protect-adr` | `hooks/hooks.json`, `hooks/protect-adr.js` | Blocca `Write` e `Edit` su un ADR esistente; lascia passare solo l'aggiunta della nota «Superata da» |
| Server MCP `acme-glossary` | `.mcp.json`, `mcp/glossary.js` | Strumenti `list_terms` e `lookup_term` sul `CONTEXT.md` del progetto |
| Eval | `evals/` | Tre casi, uno per componente, con un mock del server MCP |

Gli script sono in Node.js e non hanno dipendenze.

## Prima di iniziare

Serve la cartella `~/skill-lab` del corso 01, con `acme-shop/` e `team-marketplace/`. Se non c'è, ricreala seguendo il [README del lab 01](../../01-skill-e-plugin/lab/README.md#prima-di-iniziare).

## Passi

1. **Il subagente** (slide 20). Crea `acme-shop/.claude/agents/reviewer.md` partendo dalla soluzione. Fai una modifica da rivedere, per esempio un messaggio d'errore in inglese in `packages/core/src/coupon.ts`. Chiedi una review senza nominare il subagente: deve partire `reviewer`.
2. **L'hook** (slide 21). Prova lo script fuori dall'agente. Da `~/skill-lab/acme-shop`, con lo script copiato accanto:

   ```bash
   echo "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PWD/docs/adr/0001-i-prezzi-sono-in-centesimi-interi.md\"}}" | node protect-adr.js; echo "exit=$?"
   ```

   Deve stampare il motivo ed `exit=2`. Con un ADR che non esiste ancora deve uscire con 0.
3. **Il server MCP** (slide 22). Prova il server a mano, poi registralo per il progetto:

   ```bash
   claude mcp add --scope project acme-glossary -- node /percorso/assoluto/glossary.js
   ```

   ```bash
   claude mcp list
   ```

   Il server di progetto resta «Pending approval» finché non lo approvi aprendo `claude` nel progetto.
4. **Il plugin** (slide 23). Crea `team-marketplace/plugins/team-guardrails/` con i file della soluzione. Aggiungi la voce in `team-marketplace/.claude-plugin/marketplace.json`, accanto a `team-toolkit`. Poi:

   ```bash
   claude plugin validate ./team-marketplace
   ```

   ```bash
   claude plugin marketplace update team-marketplace
   ```

   ```bash
   claude plugin install team-guardrails@team-marketplace
   ```

   ```bash
   claude plugin details team-guardrails
   ```

   Togli `acme-shop/.claude/agents/reviewer.md` e il server di progetto del Passo 3, per non averli doppi.
5. **Le eval** (slide 24). Dalla cartella del plugin:

   ```bash
   claude plugin eval . --case glossario --runs 1 --max-cost-usd 1
   ```

   Il caso `glossario` usa un mock del server MCP e non ha bisogno di permessi aggiuntivi. Gli altri due casi hanno bisogno di `--scaffold` e di permessi espliciti:

   ```bash
   claude plugin eval . --scaffold --allow-tools Write Edit "Bash(git diff *)" --max-cost-usd 2
   ```

   Ogni run consuma token sul tuo account.

## Installare la soluzione senza fare il laboratorio

Dalla radice di questo repo:

```bash
claude plugin marketplace add ./corsi/02-subagenti-hook-mcp/lab/team-marketplace
```

```bash
claude plugin install team-guardrails@team-marketplace
```

Oppure dal marketplace del repo, insieme a `team-toolkit`:

```bash
claude plugin install team-guardrails@courses-ai
```

Con Copilot CLI i comandi sono gli stessi, con `copilot plugin` al posto di `claude plugin`.

## Che cosa è verificato

Durante la preparazione del corso:

- **Claude Code 2.1.318:**
  - `claude plugin validate` passa;
  - `claude plugin details` elenca 1 subagente, 1 hook e 1 server MCP;
  - `claude mcp list` mostra `plugin:team-guardrails:acme-glossary` connesso.
- **Lo script dell'hook:** sei casi provati a mano. Blocca la scrittura e la modifica di un ADR esistente; lascia passare un ADR nuovo, la sola nota «Superata da», gli altri file e un input non leggibile.
- **Il server MCP:** `initialize`, `tools/list` e `tools/call` provati a mano.
- **Copilot CLI 1.0.105:**
  - il plugin si installa;
  - `copilot mcp list` mostra `acme-glossary` tra i «Plugin servers».

Non verificato:

- in Copilot, l'esecuzione dell'hook e il caricamento del subagente in una sessione;
- VS Code;
- le eval: il formato dei casi segue la documentazione, ma non sono state eseguite.
