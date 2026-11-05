# courses-ai

I corsi interni del team sugli agenti di coding: Claude Code e GitHub Copilot.

Ogni corso è una cartella autonoma in `corsi/NN-slug/` con tre parti:

- `presentazione/index.html`: la presentazione interattiva, un unico file HTML senza build;
- `scaletta.md`: le tappe, la durata indicativa e cosa preparare prima;
- `lab/`: i file del laboratorio, veri e funzionanti.

## Corsi

Nessun corso ancora.

## Aprire una presentazione

Clona il repo e apri `corsi/NN-slug/presentazione/index.html` nel browser. Il file funziona anche senza rete, ma i caratteri tipografici arrivano da Google Fonts: offline il browser usa quelli di sistema.

## Struttura

```
CLAUDE.md                 istruzioni per gli agenti (AGENTS.md rimanda qui)
CONTEXT.md                glossario
docs/adr/                 le decisioni del repo
corsi/NN-slug/            un corso
```

## Contribuire

Un branch per ogni modifica e una PR verso `main`. Commit e PR in italiano, in formato conventional commits, con lo scope del corso o dell'area: `feat(corso-01): …`, `docs: …`, `ci: …`. I dettagli sono in [CLAUDE.md](CLAUDE.md).
