# courses-ai

I corsi interni del team sugli agenti di coding: Claude Code e GitHub Copilot.

Ogni corso è una cartella autonoma in `corsi/NN-slug/` con tre parti:

- `presentazione/index.html`: la presentazione interattiva, un unico file HTML senza build;
- `scaletta.md`: le tappe, la durata indicativa e cosa preparare prima;
- `lab/`: i file del laboratorio, veri e funzionanti.

## Corsi

I corsi formano un percorso che porta a mettere in funzione Heimdall, il plugin che dagli alert di sicurezza arriva a una pull request pronta per la review. Il piano delle lezioni è in [docs/percorso-heimdall.md](docs/percorso-heimdall.md).

| # | Corso | Argomenti |
|---|-------|-----------|
| 01 | [Skill e plugin per agenti di coding](corsi/01-skill-e-plugin/scaletta.md) | Skill, plugin e marketplace in Claude Code e Copilot; le skill di Matt Pocock; graphify; laboratorio `team-toolkit` |
| 02 | [Subagenti, hook e server MCP nel plugin](corsi/02-subagenti-hook-mcp/scaletta.md) | Subagenti, hook e server MCP in Claude Code e Copilot; eval dei plugin; laboratorio `team-guardrails` |
| 03 | [Orchestrare più agenti](corsi/03-orchestrare-agenti/scaletta.md) | Ruoli e artefatti versionati, rifiuto e rielaborazione, limite dei tentativi; skill e subagenti contro uno script; laboratorio `team-pipeline` |
| 04 | [Connettere i sistemi](corsi/04-connettere-i-sistemi/scaletta.md) | Server MCP degli alert, schema comune di AppScan e SonarQube, backend simulato e reale, credenziali; laboratorio `heimdall`, il primo pezzo di Heimdall |

## Aprire una presentazione

Clona il repo e apri `corsi/NN-slug/presentazione/index.html` nel browser, per esempio:

```bash
open corsi/01-skill-e-plugin/presentazione/index.html
```

Su Linux usa `xdg-open` al posto di `open`. Il file funziona anche senza rete, ma i caratteri tipografici arrivano da Google Fonts: offline il browser usa quelli di sistema.

Comandi da tastiera: `←` `→` per navigare, `N` per le note del relatore, `O` per l'indice, `Esc` per chiudere.

## Il repo è anche un marketplace

Il repo pubblica i plugin dei laboratori come marketplace `courses-ai` (vedi [ADR-0002](docs/adr/0002-il-repo-e-il-marketplace-courses-ai-dei-plugin-dei-laboratori.md)). Il repo è privato: serve l'accesso in lettura.

Claude Code:

```bash
claude plugin marketplace add AntonioVirgone/courses-ai
```

```bash
claude plugin install team-toolkit@courses-ai
```

```bash
claude plugin install team-guardrails@courses-ai
```

```bash
claude plugin install team-pipeline@courses-ai
```

```bash
claude plugin install heimdall@courses-ai
```

Copilot CLI:

```bash
copilot plugin marketplace add AntonioVirgone/courses-ai
```

```bash
copilot plugin install team-toolkit@courses-ai
```

```bash
copilot plugin install team-guardrails@courses-ai
```

```bash
copilot plugin install team-pipeline@courses-ai
```

```bash
copilot plugin install heimdall@courses-ai
```

I plugin dei corsi 01–03 sono didattici: codificano le convenzioni del progetto di esempio `acme-shop`, non quelle di un progetto reale. Dal corso 04 i laboratori costruiscono `heimdall`, un pezzo alla volta (ADR-0005); nei corsi usa solo dati inventati (ADR-0004).

## Struttura

```
CLAUDE.md                 istruzioni per gli agenti (AGENTS.md rimanda qui)
CONTEXT.md                glossario
.claude-plugin/           il marketplace courses-ai
docs/adr/                 le decisioni del repo
scripts/validate.py       controlli su JSON, skill, plugin e corsi
corsi/NN-slug/            un corso
```

## Contribuire

Un branch per ogni modifica e una PR verso `main`. Commit e PR in italiano, in formato conventional commits, con lo scope del corso o dell'area: `feat(corso-01): …`, `docs: …`, `ci: …`. I dettagli sono in [CLAUDE.md](CLAUDE.md).

Prima di aprire una PR (serve PyYAML):

```bash
python3 scripts/validate.py
```

La stessa verifica, più `claude plugin validate` su ogni marketplace e plugin, gira in CI su ogni PR.
