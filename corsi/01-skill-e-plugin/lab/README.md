# Laboratorio · team-toolkit

Tre skill che codificano le convenzioni del progetto di esempio `acme-shop`, un plugin che le raccoglie e un marketplace che lo distribuisce. Le slide del laboratorio sono la 29 e le successive della [presentazione](../presentazione/index.html#s29).

| Cartella | Che cos'è |
|----------|-----------|
| [`acme-shop/`](acme-shop/) | Il punto di partenza: un repo di esempio senza skill |
| [`team-marketplace/`](team-marketplace/) | La soluzione: il marketplace con il plugin `team-toolkit`, come alla fine del Passo 3 |

Le skill:

| Skill | Chi la avvia | Che cosa fa |
|-------|--------------|-------------|
| `conventional-commit` | tu, con `/conventional-commit 12` | Scrive il messaggio di commit nel formato del team |
| `new-adr` | tu, con `/new-adr la decisione` | Crea un ADR numerato dal template |
| `italian-copy` | il modello, da solo | Applica le regole per i testi in italiano |

## Prima di iniziare

Lavora su una copia, fuori da questo repo, così la soluzione resta intatta:

```bash
mkdir -p ~/skill-lab && cp -r corsi/01-skill-e-plugin/lab/acme-shop ~/skill-lab/
```

```bash
cd ~/skill-lab/acme-shop && git init && git add . && git commit -m "chore: progetto di partenza"
```

## Passi

1. **Le skill** (slide 30). Crea in `acme-shop/.claude/skills/` le tre cartelle con i loro `SKILL.md` e `new-adr/template.md`. Il testo è nelle slide. Se ti blocchi, confronta con `team-marketplace/plugins/team-toolkit/skills/`.
2. **Prova le skill** (slide 31). In Claude Code: `/conventional-commit 12` dopo `git add -p`, poi `/new-adr …`. Per `italian-copy` chiedi di completare l'esercizio in `packages/core/src/coupon.ts`, senza nominare la skill. In Copilot CLI: `/skills list`.
3. **Il plugin** (slide 32). Da `~/skill-lab` lancia lo script della slide: crea `team-marketplace/` accanto a `acme-shop/`. Poi togli le skill da `acme-shop/.claude/skills/`, per non averle doppie.
4. **Valida e installa** (slide 33):

   ```bash
   claude plugin validate ./team-marketplace
   ```

   ```bash
   claude plugin marketplace add ./team-marketplace
   ```

   ```bash
   claude plugin install team-toolkit@team-marketplace
   ```

   In Copilot CLI usa il percorso assoluto del marketplace:

   ```bash
   copilot plugin marketplace add "$PWD/team-marketplace"
   ```

   ```bash
   copilot plugin install team-toolkit@team-marketplace
   ```

5. **Condividi** (slide 34). Nel corso il marketplace remoto è già pronto: è questo repo.

   ```bash
   claude plugin marketplace add AntonioVirgone/courses-ai
   ```

   ```bash
   claude plugin install team-toolkit@courses-ai
   ```

## Installare la soluzione senza fare il laboratorio

Dalla radice di questo repo:

```bash
claude plugin marketplace add ./corsi/01-skill-e-plugin/lab/team-marketplace
```

```bash
claude plugin install team-toolkit@team-marketplace
```

Con Copilot CLI il marketplace locale va aggiunto con il percorso assoluto, perché `./cartella` viene letto come `owner/repo` di GitHub:

```bash
copilot plugin marketplace add "$PWD/corsi/01-skill-e-plugin/lab/team-marketplace"
```

```bash
copilot plugin install team-toolkit@team-marketplace
```
