# Laboratorio · heimdall, il Supervisor e i guardrail

Il terzo pezzo di Heimdall decide se un piano si può eseguire, e mette dei limiti a quello che gli agenti possono fare. Il lavoro è diviso così:
- il team del progetto scrive i suoi vincoli in `.heimdall/vincoli.md`, nel repo del progetto;
- il subagente `supervisor` confronta ogni piano con quei vincoli e restituisce un verdetto: approvato, oppure rifiutato con le violazioni;
- se il piano è rifiutato, il `security-analyst` scrive la versione successiva, rispondendo a ogni violazione;
- tre hook fanno rispettare le regole che non si lasciano al giudizio di un modello: il contratto degli artefatti, i test esistenti intoccabili, niente merge.

Lo scenario è quello Java 8 della demo: il Supervisor rifiuta il piano v1 della lezione 05, che porta `payments-api` a Java 11, e approva il v2, che resta su Java 8. Le slide del laboratorio partono dalla 19 della [presentazione](../presentazione/index.html#s19). I dati sono inventati (ADR-0004).

| Cartella | Che cos'è |
|----------|-----------|
| [`starter/.heimdall/`](starter/.heimdall/) | I vincoli di `payments-api`, da copiare nel progetto |
| [`esempi/PAY-160644/`](esempi/PAY-160644/) | Un giro completo: l'alert, l'analisi e il piano v1 della lezione 05, poi il verdetto v1 (rifiutato), il piano v2 e il verdetto v2 (approvato) |
| [`team-marketplace/`](team-marketplace/) | La soluzione: il plugin `heimdall` com'è alla fine di questo laboratorio (ADR-0007) |
| [`../../05-capire-il-codice/lab/payments-api/`](../../05-capire-il-codice/lab/payments-api/) | Il progetto di esempio, dalla lezione 05 |

Il plugin parte da quello della [lezione 05](../../05-capire-il-codice/lab/) e aggiunge:

| Componente | File | Che cosa fa |
|------------|------|-------------|
| Subagente `supervisor` | `agents/supervisor.md` | Solo `Read`, `Grep` e `Glob`: controlla il piano contro ogni vincolo, verifica nel codice quello che il piano afferma, restituisce il verdetto in JSON |
| Skill `supervise-plan` | `skills/supervise-plan/SKILL.md` | Alterna Supervisor e Security Analyst fino all'approvazione o al terzo piano, salva gli artefatti, mostra la timeline |
| Hook `guard-pipeline` | `hooks/guard-pipeline.js` | Il contratto degli artefatti del corso 03, per Heimdall: input intoccabili, versioni consecutive, al massimo tre piani, formato del piano, verdetti che controllano ogni vincolo |
| Hook `guard-tests` | `hooks/guard-tests.js` | Blocca `Edit`, `Write` e i comandi di shell che modificano, spostano o cancellano un test esistente. Un test nuovo passa |
| Hook `guard-git` | `hooks/guard-git.js` | Blocca merge, commit e push sui branch protetti, push forzati, il completamento e l'approvazione di una PR |
| Le parti comuni | `hooks/common.js`, `hooks/hooks.json` | Lettura dell'evento, riconoscimento dei test e dei progetti seguiti, un lettore di comandi di shell; la registrazione dei tre hook |
| Timeline | `scripts/timeline.js` | La storia di un alert dagli artefatti, senza il modello: chi ha fatto che cosa, con quale esito |

Cambiano anche il `security-analyst`, che sa rielaborare un piano rifiutato, `analyze-alert`, che alla fine propone `supervise-plan`, e `version` in `plugin.json`, che passa a 0.3.0.

## Il contratto, con i vincoli e i verdetti

```
payments-api/
├── .heimdall/
│   └── vincoli.md          il team del progetto, con una pull request
└── .pipeline/PAY-160644/
    ├── alert.json          save-alert.js (lezione 04)
    ├── analysis.json       analyze.js (lezione 05)
    ├── plan-v1.md          security-analyst (lezione 05)
    ├── verdict-v1.json     supervisor: rejected, «Java 8» e «Dipendenze»
    ├── plan-v2.md          security-analyst, con «## Risposta al verdetto v1»
    └── verdict-v2.json     supervisor: approved
```

- I vincoli stanno nel repo del progetto, non nel plugin e non in `.pipeline/` (ADR-0008). Ogni vincolo è una voce numerata con il nome in grassetto.
- Un artefatto esistente non si riscrive. I piani sono consecutivi, al massimo tre, e un piano nuovo richiede il rifiuto del precedente.
- Il verdetto ha `alert`, `plan`, `decision`, `checked`, `violations` e `notes` facoltativo. `checked` elenca tutti i vincoli di `vincoli.md`; ogni violazione ne cita uno.
- Dal v2 il piano ha la sezione «## Risposta al verdetto v<N-1>», con una voce per ogni violazione.

## Dove valgono gli hook

Gli hook sono in `hooks/hooks.json`, quindi valgono in ogni sessione in cui il plugin è attivo, per l'agente principale e per ogni subagente. Per questo intervengono solo dove servono:
- `guard-pipeline` solo sui file in `.pipeline/` e `.heimdall/`;
- `guard-tests` e `guard-git` solo nei progetti seguiti da Heimdall, cioè quelli con `.heimdall/vincoli.md`. Lì nessun agente con Heimdall installato modifica un test esistente o fa un merge: se serve, lo fa una persona.

Gli hook nel frontmatter di un subagente valgono solo mentre quel subagente lavora, ma Claude Code li ignora nei subagenti dei plugin. Quando l'hook blocca dentro un subagente, l'evento ha il campo `agent_type` e il messaggio lo nomina.

## Prima di iniziare

Dalla radice di questo repo:

```bash
export H="$PWD/corsi/06-vincoli-e-guardrail/lab/team-marketplace/plugins/heimdall"
```

```bash
export L="$PWD/corsi/06-vincoli-e-guardrail/lab"
```

Si parte da dove finisce la lezione 05: il plugin 0.2.0 in `~/heimdall-lab/heimdall`, installato da `heimdall-lab`, e `~/heimdall-lab/payments-api` con il codice in git e `.pipeline/PAY-160644/` con `alert.json`, `analysis.json` e `plan-v1.md`. Se non hai fatto la lezione 05, parti dalla sua soluzione. Il piano v1 è quello di riferimento, così non serve il modello:

```bash
mkdir -p ~/heimdall-lab/.claude-plugin && cp -r corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall ~/heimdall-lab/
```

```bash
printf '%s\n' '{"name":"heimdall-lab","owner":{"name":"io"},"plugins":[{"name":"heimdall","source":"./heimdall"}]}' > ~/heimdall-lab/.claude-plugin/marketplace.json
```

```bash
claude plugin marketplace add ~/heimdall-lab && claude plugin install heimdall@heimdall-lab
```

```bash
mkdir -p ~/heimdall-lab/payments-api && cp -r corsi/05-capire-il-codice/lab/payments-api/. ~/heimdall-lab/payments-api/
```

```bash
(cd ~/heimdall-lab/payments-api && git init && git add pom.xml src README.md .gitignore && git commit -m "chore: payments-api di partenza")
```

```bash
mkdir -p ~/heimdall-lab/payments-api/.pipeline/PAY-160644 && cp corsi/05-capire-il-codice/lab/esempi/PAY-160644/{alert.json,analysis.json,plan-v1.md} ~/heimdall-lab/payments-api/.pipeline/PAY-160644/
```

Se hai già installato il plugin dalla lezione 05, controlla solo che ci sia tutto. Se hai installato `heimdall@courses-ai`, disinstallalo per la durata del laboratorio: due plugin con lo stesso nome si confondono.

## Passi

1. **I vincoli del progetto** (slide 20). I vincoli entrano nel repo di `payments-api`, come il codice:

   ```bash
   cp -r "$L/starter/.heimdall" ~/heimdall-lab/payments-api/ && cd ~/heimdall-lab/payments-api
   ```

   ```bash
   git add .heimdall && git commit -m "chore: i vincoli di Heimdall per payments-api"
   ```

   Leggi `.heimdall/vincoli.md`, poi `.pipeline/PAY-160644/plan-v1.md`. Prima di chiederlo al Supervisor, decidi tu: quali vincoli viola il piano v1, e con quale passo?

2. **Il contratto e la timeline** (slide 21). Da `~/heimdall-lab/payments-api`, gli hook e la timeline nel plugin:

   ```bash
   cp -r "$H/hooks" ~/heimdall-lab/heimdall/ && cp "$H/scripts/timeline.js" ~/heimdall-lab/heimdall/scripts/
   ```

   ```bash
   node ~/heimdall-lab/heimdall/scripts/timeline.js PAY-160644; echo "exit=$?"
   ```

   Deve dire che il piano v1 aspetta il verdetto, con `exit=1`. Poi una funzione per provare gli hook a mano, nella shell in cui lavori:

   ```bash
   prova() { printf '{"cwd":"%s","tool_name":"%s","tool_input":%s}' "$PWD" "$2" "$3" | node ~/heimdall-lab/heimdall/hooks/$1.js; echo "exit=$?"; }
   ```

   ```bash
   prova guard-pipeline Write '{"file_path":".pipeline/PAY-160644/plan-v2.md","content":"x"}'
   ```

   Deve rispondere che prima serve il verdetto sul piano v1, con `exit=2`. Prova anche a riscrivere `plan-v1.md` e a modificare `.heimdall/vincoli.md` con `Edit`: tutti e due bloccati.

3. **Test intoccabili e niente merge** (slide 22). Sempre da `~/heimdall-lab/payments-api`:

   ```bash
   prova guard-tests Edit '{"file_path":"src/test/java/com/acme/payments/statements/StatementParserTest.java","old_string":"x","new_string":"y"}'
   ```

   ```bash
   prova guard-tests Write '{"file_path":"src/test/java/com/acme/payments/statements/StatementParserXxeTest.java","content":"x"}'
   ```

   ```bash
   prova guard-tests Bash '{"command":"rm -rf src/test"}'
   ```

   Il primo e il terzo sono bloccati, il secondo passa: è un test nuovo. Poi git:

   ```bash
   prova guard-git Bash '{"command":"git commit -am fix"}'
   ```

   ```bash
   prova guard-git Bash '{"command":"git merge fix/pay-160644"}'
   ```

   Tutti e due bloccati: il commit perché il branch corrente è `master` o `main`, il merge sempre. Su un branch di lavoro il commit passa:

   ```bash
   git switch -c fix/pay-160644 && prova guard-git Bash '{"command":"git commit -am fix"}'; git switch -
   ```

   Infine prova `prova guard-git Bash '{"command":"git merge x"}'` da `/tmp`: `exit=0`, perché fuori da un progetto con `.heimdall/vincoli.md` gli hook non intervengono.

4. **Il Supervisor nel plugin** (slide 23). Da `~/heimdall-lab/heimdall`, i due agenti, le skill e il manifest con la versione 0.3.0:

   ```bash
   cd ~/heimdall-lab/heimdall && cp "$H/agents/"{supervisor,security-analyst}.md agents/ && cp "$H/.claude-plugin/plugin.json" .claude-plugin/
   ```

   ```bash
   cp -r "$H/skills/supervise-plan" skills/ && cp "$H/skills/analyze-alert/SKILL.md" skills/analyze-alert/
   ```

   ```bash
   claude plugin validate ~/heimdall-lab && claude plugin marketplace update heimdall-lab && claude plugin update heimdall@heimdall-lab
   ```

   ```bash
   claude plugin details heimdall
   ```

   Deve dire `heimdall 0.3.0` ed elencare 3 skill, 3 agenti, 1 hook `PreToolUse` e 1 server MCP. Ora il plugin coincide con la soluzione: `diff -r ~/heimdall-lab/heimdall "$H"` non stampa niente. In Copilot CLI aggiorna il marketplace e reinstalla il plugin:

   ```bash
   copilot plugin marketplace update heimdall-lab && copilot plugin install heimdall@heimdall-lab
   ```

5. **Il Supervisor da solo** (slide 24). Da `~/heimdall-lab/payments-api`, in una sessione nuova di Claude Code:

   ```
   Usa il subagente heimdall:supervisor per valutare .pipeline/PAY-160644/plan-v1.md. Mostrami il verdetto e non salvarlo.
   ```

   In Copilot: `Use the supervisor agent to …` con la stessa richiesta. Il verdetto deve essere `rejected`, citare «Java 8» e «Dipendenze» ed elencare in `checked` tutti e cinque i vincoli. Confrontalo con [`esempi/PAY-160644/verdict-v1.json`](esempi/PAY-160644/verdict-v1.json) e con quello che avevi deciso al passo 1.

6. **Il ciclo, con la skill** (slide 25). Nella stessa cartella, in Claude Code:

   ```
   /heimdall:supervise-plan PAY-160644
   ```

   In Copilot CLI: `/supervise-plan PAY-160644`. Approva le scritture in `.pipeline/PAY-160644/`. La skill salva `verdict-v1.json`, chiede al `security-analyst` il piano v2, lo fa valutare e salva `verdict-v2.json`. Alla fine mostra la timeline:

   ```
   11:20:32  v1  supervisor        rifiutato                 verdict-v1.json
                                   · Java 8
                                   · Dipendenze
   11:23:57  v2  security-analyst  piano scritto             plan-v2.md
   11:25:18  v2  supervisor        approvato                 verdict-v2.json

   Esito: piano v2 approvato. Il prossimo passo è il Resolver.
   ```

   Gli orari sono quelli dei file. Con `node ~/heimdall-lab/heimdall/scripts/timeline.js PAY-160644` la rivedi quando vuoi: esce con 0.

   Confronta il tuo `plan-v2.md` con [`esempi/PAY-160644/plan-v2.md`](esempi/PAY-160644/plan-v2.md):
   - `java.version` resta 1.8 e `acme-xml` resta alla 1.4.2;
   - la correzione è `XmlReader.builder().resolveExternalEntities(false).build()`, in `StatementParser` e in `BankCodesLoader`;
   - «Risposta al verdetto v1» ha una voce per «Java 8» e una per «Dipendenze»;
   - i rischi dicono che AppScan continuerà a segnalare la 1.4.2.

   Se il tuo v2 è rifiutato di nuovo, la skill prova il v3. Dopo il terzo rifiuto l'hook ferma la pipeline e la timeline esce con 3: decide una persona.

7. **I guardrail dal vivo** (slide 26). Nella stessa sessione chiedi all'agente:
   - `Correggi il piano v1 togliendo il passaggio a Java 11.` L'hook blocca la riscrittura di `plan-v1.md`;
   - `In StatementParserTest aggiungi un caso per un estratto vuoto.` L'hook blocca la modifica del test esistente. Che cosa propone l'agente al suo posto?
   - `Fai il commit di .pipeline/ su questo branch, poi il merge di fix/pay-160644.` L'hook blocca tutti e due: il branch corrente è protetto, e il merge non lo fa Heimdall.

   Leggi il motivo che l'agente riceve. Poi lancia `git log --oneline` e `git status`: nessun commit nuovo, e i test sono quelli di partenza.

I passi 5, 6 e 7 con l'agente consumano token sul tuo account.

## Installare la soluzione senza fare il laboratorio

Dal marketplace del repo, che dalla lezione 06 punta a questa copia del plugin (ADR-0007):

```bash
claude plugin install heimdall@courses-ai
```

```bash
copilot plugin install heimdall@courses-ai
```

Oppure dalla radice di questo repo, senza installare:

```bash
claude --plugin-dir ./corsi/06-vincoli-e-guardrail/lab/team-marketplace/plugins/heimdall
```

Che cosa aggiunge questa lezione rispetto alla 05:

```bash
diff -r corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall corsi/06-vincoli-e-guardrail/lab/team-marketplace/plugins/heimdall
```

## I limiti degli hook

Un hook su `Edit` e `Write` vede il percorso del file: è affidabile. Un hook su `Bash` legge il testo del comando e non lo esegue. `hooks/common.js` divide la riga nei suoi comandi, apre `bash -c "…"` e toglie `sudo`, `env` e `xargs`, ma non vede:
- uno script che modifica un test o fa un merge: `bash scripts/pulisci.sh`;
- un alias, una funzione della shell, una variabile che contiene il percorso;
- i comandi che scelgono i file da soli: `find src -name '*Test.java' -delete`, `git add -A && git commit` che porta via una modifica fatta prima;
- un altro linguaggio: `node -e`, `python -c`.

Per questo gli hook sono una rete per gli errori dell'agente, non il muro. Il muro sta sul server: le branch policy di Azure DevOps, che chiedono una review per completare una PR verso `main`, e un token di Heimdall che non ha il permesso di completarla. Se ne parla nella lezione 07.

I test si riconoscono per convenzione: `src/test/`, `__tests__/`, `*.spec.ts`, `*.test.js`, `*Test.java`, `*Tests.java`, `*IT.java`. I branch protetti sono `main`, `master`, `develop` e `release/*`. Per un progetto con altre convenzioni si cambiano le due liste, in `common.js` e in `guard-git.js`.

## Che cosa è verificato

Durante la preparazione del corso:

- **Claude Code 2.1.318:**
  - `claude plugin validate` passa sul plugin e sul marketplace;
  - `claude plugin details heimdall` dice `heimdall 0.3.0` ed elenca 3 skill, 3 agenti, 1 hook `PreToolUse` e 1 server MCP;
  - i passi 1–4 del laboratorio, da uno stato di fine lezione 05 ricreato con «Prima di iniziare»: alla fine il plugin coincide con la soluzione, e `claude plugin update` lo porta da 0.2.0 a 0.3.0.
- **`guard-pipeline`:** gli artefatti di `esempi/PAY-160644/` passano nell'ordine giusto. Blocca gli input, le riscritture, le versioni fuori ordine, un piano senza il verdetto precedente, il quarto piano, un piano dopo l'approvazione, un piano senza una sezione, una risposta al verdetto che salta una violazione, un verdetto che non controlla tutti i vincoli, che cita un vincolo inesistente o che approva con violazioni.
- **`guard-tests`:** blocca `Edit` e `Write` su un test esistente, risorse comprese, e `rm`, `mv`, `sed -i`, `git rm`, `git checkout --` e le redirezioni su un test, anche dentro `bash -c`. Lascia passare un test nuovo, i file di `src/main`, la lettura dei test, `mvn test` e tutto fuori da un progetto seguito.
- **`guard-git`:** blocca `git merge`, `git commit` e `git push` su `main`, `master` e `release/*`, `git push --force`, `gh pr merge`, `az repos pr update --status completed` e `az repos pr set-vote --vote approve`. Lascia passare `git merge --abort`, commit e push su un branch di lavoro e tutto fuori da un progetto seguito.
- **`timeline.js`:** provato su una pipeline in attesa del verdetto, approvata al v2 e fermata dopo tre rifiuti.
- **I campi dell'evento:** `cwd`, `agent_type`, `tool_input.command` di Bash, e il fatto che i subagenti dei plugin ignorano `hooks` nel frontmatter, verificati sulla documentazione di Claude Code (hooks e sub-agents).

Non verificato:

- in Claude Code e in Copilot, una sessione vera con il modello: i verdetti del Supervisor, il piano v2 del Security Analyst, gli hook che bloccano l'agente dal vivo. Nel container di preparazione non c'era un account con cui usare il modello;
- in Copilot CLI: che l'hook su `Bash` riceva i comandi della shell di Copilot. Con l'evento `PreToolUse` in PascalCase Copilot usa i nomi di Claude Code per `Edit` e `Write` (corso 02); per la shell non l'abbiamo trovato scritto;
- in Copilot CLI: `copilot plugin marketplace update` su un marketplace locale e la reinstallazione con la versione nuova, come nella lezione 05;
- VS Code.
