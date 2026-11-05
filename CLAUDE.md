# Istruzioni per gli agenti

Questo repo raccoglie i corsi interni del team su Claude Code e GitHub Copilot. Il glossario è in [CONTEXT.md](CONTEXT.md), le decisioni in [docs/adr/](docs/adr/).

## Struttura

- Ogni corso è una cartella autonoma `corsi/NN-slug/` con `presentazione/index.html`, `scaletta.md` e `lab/` (ADR-0001). Un corso nuovo ha le stesse tre parti e una riga nella tabella del README.
- `.claude-plugin/marketplace.json` alla radice è il marketplace `courses-ai` (ADR-0002). Ogni voce punta con un percorso relativo al plugin dentro il `lab/` di un corso: i file del plugin esistono in una sola copia. Se sposti un plugin, aggiorna la voce.

## Lingue

- Documentazione, commenti, messaggi di commit e PR in italiano.
- Identificatori di codice, nomi di file di codice, chiavi JSON e nomi delle skill in inglese.

## Presentazioni

- Un unico file HTML autonomo, senza build e senza dipendenze esterne. Unica eccezione: i font da Google Fonts.
- I file del laboratorio mostrati nelle slide e quelli in `lab/` devono coincidere. Se ne cambi uno, aggiorna l'altro nello stesso commit.
- Non inventare comandi, campi o percorsi. Verifica sulla documentazione ufficiale (code.claude.com, docs.github.com, code.visualstudio.com). Se non riesci a verificare, scrivilo nella PR.

## Skill e plugin

- Frontmatter delle skill: `name` in kebab-case, al massimo 64 caratteri e uguale al nome della cartella; `description` al massimo 1024 caratteri.
- I valori YAML che contengono `: ` o iniziano con `[` vanno tra virgolette o in un blocco `>-`.
- Il manifest di un plugin sta in `.claude-plugin/plugin.json`; `skills/`, `agents/` e `hooks/` alla radice del plugin.
- Alza `version` in `plugin.json` a ogni modifica di un plugin.

Prima di committare:

```bash
python3 scripts/validate.py
```

Se la CLI di Claude Code è disponibile, valida anche ogni marketplace e plugin toccato:

```bash
claude plugin validate <cartella>
```

La CI esegue entrambi i controlli su ogni PR.

## Commit e PR

- Conventional commits con scope uguale al corso o all'area: `feat(corso-01): …`, `fix(corso-01): …`, `docs: …`, `ci: …`.
- Un branch per ogni modifica e una PR verso `main`. Niente commit diretti su `main`.

## ADR

- File `docs/adr/NNNN-slug.md`, numero a quattro cifre, slug in italiano.
- Il titolo è la decisione in una frase. Il corpo spiega in prosa che cosa si è deciso e perché. Poi `## Considered Options` con le alternative, nella forma `- **Nome.** Scartato: motivo.`
- Una decisione che cambia non si riscrive. Si scrive un ADR nuovo e in cima al vecchio si aggiunge `> **Superata da ADR-NNNN** su …. Il resto resta in vigore.`
- Ogni ADR va in un commit `docs:` a sé.
