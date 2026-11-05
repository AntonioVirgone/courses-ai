# Laboratorio · team-pipeline

Una pipeline con due agenti che si passano il lavoro attraverso dei file:
- l'`analyst` scrive il piano di correzione di un alert;
- il `supervisor` lo valuta contro i vincoli del progetto;
- se il piano viene rifiutato, l'analyst lo rielabora.

La guida è una skill. Un hook fa rispettare il contratto degli artefatti e uno script ne ricostruisce la timeline. Le slide del laboratorio partono dalla 16 della [presentazione](../presentazione/index.html#s16).

Il progetto è `acme-shop` del corso 01: questo corso lo cita invece di copiarlo (ADR-0001). L'alert è simulato e i dati sono inventati (ADR-0004).

| Cartella | Che cos'è |
|----------|-----------|
| [`starter/.pipeline/`](starter/.pipeline/) | Gli input da copiare in `acme-shop`: i vincoli del progetto e l'alert `ACME-101` |
| [`esempi/`](esempi/) | Un giro completo già scritto: piano v1 rifiutato, piano v2 approvato |
| [`team-marketplace/`](team-marketplace/) | La soluzione: il marketplace con il plugin `team-pipeline` |
| [`../../01-skill-e-plugin/lab/acme-shop/`](../../01-skill-e-plugin/lab/acme-shop/) | Il progetto di esempio, dal corso 01 |

I componenti del plugin:

| Componente | File | Che cosa fa |
|------------|------|-------------|
| Skill `remediation-plan` | `skills/remediation-plan/SKILL.md` | Guida l'agente principale: delega i piani all'analyst e i verdetti al supervisor, salva gli artefatti, si ferma all'approvazione o al limite |
| Subagente `analyst` | `agents/analyst.md` | Legge alert e codice, restituisce il piano. Solo strumenti di lettura |
| Subagente `supervisor` | `agents/supervisor.md` | Valuta il piano contro `.pipeline/vincoli.md`, restituisce il verdetto in JSON. Solo strumenti di lettura |
| Hook `guard-pipeline` | `hooks/hooks.json`, `hooks/guard-pipeline.js` | Blocca le scritture in `.pipeline/` che rompono il contratto: riscritture, versioni fuori ordine, più di tre piani, verdetti fuori schema |
| Timeline | `scripts/timeline.js` | Racconta la pipeline leggendo i file, senza il modello |
| Orchestrazione da script | `scripts/run-pipeline.sh`, `scripts/verdict.schema.json` | La stessa pipeline guidata da uno script con `claude -p`, per confrontare le due strade |

Gli script sono in Node.js e non hanno dipendenze.

## Il contratto degli artefatti

```
.pipeline/
├── vincoli.md              input: i vincoli del progetto, li scrive una persona
└── ACME-101/
    ├── alert.json          input: l'alert, lo scrive una persona (dalla lezione 04, il Data Retriever)
    ├── plan-v1.md          analyst
    ├── verdict-v1.json     supervisor: rejected
    ├── plan-v2.md          analyst, con «## Risposta al verdetto v1»
    └── verdict-v2.json     supervisor: approved
```

- Un artefatto esistente non si riscrive. Una rielaborazione è una versione nuova.
- I piani sono consecutivi. Un piano nuovo richiede il rifiuto del precedente.
- Al massimo tre piani: v1 e due rielaborazioni. Dopo il terzo rifiuto decide una persona.
- Il verdetto segue lo schema di `scripts/verdict.schema.json`: `alert`, `plan`, `decision`, `violations`, `notes` facoltativo.

## Prima di iniziare

Dalla radice di questo repo prepara una copia nuova di `acme-shop` con gli input della pipeline:

```bash
export P="$PWD/corsi/03-orchestrare-agenti/lab/team-marketplace/plugins/team-pipeline"
```

```bash
export E="$PWD/corsi/03-orchestrare-agenti/lab/esempi"
```

```bash
mkdir -p ~/pipeline-lab && cp -r corsi/01-skill-e-plugin/lab/acme-shop ~/pipeline-lab/
```

```bash
cp -r corsi/03-orchestrare-agenti/lab/starter/.pipeline ~/pipeline-lab/acme-shop/
```

```bash
cd ~/pipeline-lab/acme-shop && git init && git add . && git commit -m "chore: progetto di partenza con l'alert ACME-101"
```

Usa una copia nuova anche se hai fatto il corso 01: l'esercizio su `coupon.ts` di quel laboratorio corregge proprio il problema dell'alert.

## Passi

1. **Installa il plugin** (slide 17). Dal marketplace del repo, già registrato nel corso 01:

   ```bash
   claude plugin marketplace update courses-ai
   ```

   ```bash
   claude plugin install team-pipeline@courses-ai
   ```

   ```bash
   claude plugin details team-pipeline
   ```

   Deve elencare 1 skill, 2 agenti e 1 hook. In Copilot CLI:

   ```bash
   copilot plugin marketplace update courses-ai
   ```

   ```bash
   copilot plugin install team-pipeline@courses-ai
   ```

   Se il marketplace `courses-ai` non c'è, aggiungilo con `claude plugin marketplace add AntonioVirgone/courses-ai` (o `copilot plugin marketplace add AntonioVirgone/courses-ai`).

2. **Prova l'hook a mano** (slide 18). Da `~/pipeline-lab/acme-shop`:

   ```bash
   echo "{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"$PWD/.pipeline/ACME-101/plan-v2.md\",\"content\":\"x\"}}" | node "$P/hooks/guard-pipeline.js"; echo "exit=$?"
   ```

   Deve rispondere che il prossimo piano è `plan-v1.md`, con `exit=2`. Prova anche `vincoli.md` (bloccato) e `packages/core/src/coupon.ts` (`exit=0`: fuori da `.pipeline/`, l'hook non interviene).

3. **Il supervisor da solo** (slide 19). Copia il piano di prova:

   ```bash
   cp "$E/plan-v1.md" piano-di-prova.md
   ```

   In Claude Code chiedi: `Usa il subagente team-pipeline:supervisor per valutare piano-di-prova.md contro .pipeline/vincoli.md; l'alert è .pipeline/ACME-101/alert.json.` In Copilot: `Use the supervisor agent to …` con la stessa richiesta.

   Il verdetto deve essere `rejected` e citare almeno «Nessuna dipendenza nuova» e «Testi in italiano». Confrontalo con [`esempi/verdict-v1.json`](esempi/verdict-v1.json). Poi cancella `piano-di-prova.md`.

4. **La pipeline con la skill** (slide 20). In Claude Code:

   ```
   /team-pipeline:remediation-plan ACME-101
   ```

   In Copilot CLI: `/remediation-plan ACME-101`. Approva le scritture in `.pipeline/ACME-101/` quando te lo chiede. Di solito il piano v1 segue il suggerimento dell'alert (`date-fns`) e il supervisor lo rifiuta. Se il v1 è approvato al primo colpo, va bene lo stesso: la rielaborazione l'hai vista al Passo 3.

5. **Leggi la traccia** (slide 21):

   ```bash
   node "$P/scripts/timeline.js"
   ```

   Apri i piani e i verdetti. Ogni violazione del v1 ha una risposta nel v2? Poi prova a rompere il contratto: chiedi all'agente di «correggere» `plan-v1.md` invece di scriverne uno nuovo. L'hook deve bloccarlo.

6. **La stessa pipeline da script** (slide 22, facoltativo, solo Claude Code). Togli gli artefatti del Passo 4 e lancia lo script:

   ```bash
   rm .pipeline/ACME-101/plan-v* .pipeline/ACME-101/verdict-v*
   ```

   ```bash
   bash "$P/scripts/run-pipeline.sh" ACME-101; echo "exit=$?"
   ```

   Lo script esce con 0 se un piano è approvato e con 3 se si ferma dopo tre rifiuti. Confronta: chi ha deciso quando fermarsi, nei due casi?

Ogni passo che coinvolge il modello consuma token sul tuo account. Lo script chiama il modello due volte per ogni versione del piano.

## Installare la soluzione senza il marketplace del repo

Dalla radice di questo repo, in Claude Code:

```bash
claude plugin marketplace add ./corsi/03-orchestrare-agenti/lab/team-marketplace
```

```bash
claude plugin install team-pipeline@team-marketplace
```

In Copilot CLI il marketplace locale va aggiunto con il percorso assoluto, perché `./cartella` viene letto come `owner/repo` di GitHub:

```bash
copilot plugin marketplace add "$PWD/corsi/03-orchestrare-agenti/lab/team-marketplace"
```

```bash
copilot plugin install team-pipeline@team-marketplace
```

Se hai già un marketplace di nome `team-marketplace` dal corso 01, usa `--plugin-dir` per provare senza installare:

```bash
claude --plugin-dir ./corsi/03-orchestrare-agenti/lab/team-marketplace/plugins/team-pipeline
```

## Che cosa è verificato

Durante la preparazione del corso:

- **Claude Code 2.1.318:**
  - `claude plugin validate` passa sul plugin e sui marketplace;
  - `claude plugin details team-pipeline` elenca 1 skill, 2 agenti e 1 hook PreToolUse.
- **Lo script dell'hook:** 22 casi provati a mano. Blocca:
  - gli input;
  - le riscritture e le modifiche;
  - i file sconosciuti;
  - le versioni fuori ordine;
  - un piano senza il verdetto precedente;
  - il quarto piano;
  - un piano dopo l'approvazione;
  - i piani e i verdetti fuori formato.

  Lascia passare gli artefatti validi, i file fuori da `.pipeline/` e un input non leggibile. Gli artefatti di `esempi/` passano nell'ordine giusto.
- **`timeline.js`:** provato su una pipeline aperta, approvata e fermata al limite.
- **`run-pipeline.sh`:** provato con un finto `claude` che restituisce risposte preparate. Esce con 0 quando il v2 è approvato e con 3 dopo tre rifiuti, e rifiuta di ripartire su una pipeline già iniziata.
- **Copilot CLI 1.0.105:** il plugin si installa dal marketplace locale. Il messaggio conta 1 skill e non nomina agenti e hook.

Non verificato:

- in Claude Code e in Copilot, una sessione vera con il modello: la delega dalla skill, i verdetti del supervisor, il rifiuto del v1;
- `run-pipeline.sh` con il vero `claude -p`, e in particolare `-p` insieme a `--agent` con il nome di un agente di plugin: i due flag sono documentati, ma la documentazione non ha un esempio che li usa insieme;
- in Copilot, il caricamento dei subagenti e l'esecuzione dell'hook. `${CLAUDE_PLUGIN_ROOT}` nel comando dell'hook è documentato da GitHub solo per i server MCP degli agenti dei plugin;
- VS Code.
