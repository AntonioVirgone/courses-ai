---
name: conventional-commit
description: Scrive il messaggio di commit secondo le convenzioni del team
  (conventional commits, descrizione in italiano, numero dell'issue in fondo).
argument-hint: "[numero-issue]"
disable-model-invocation: true
allowed-tools: Bash(git diff *) Bash(git status *)
---

# Messaggio di commit

1. Leggi le modifiche in stage con `git diff --staged`.
2. Scegli il tipo: feat, fix, refactor, test, docs, chore.
3. Lo scope è l'app o il pacchetto toccato: api, web, mobile, core, types.
4. Descrizione in italiano, senza punto finale, al massimo 72 caratteri.
5. Chiudi con il numero dell'issue: (#$ARGUMENTS).

Esempio: `feat(web): il carrello mostra il totale con la spedizione (#12)`

Mostra il messaggio e chiedi conferma prima di eseguire `git commit`.
