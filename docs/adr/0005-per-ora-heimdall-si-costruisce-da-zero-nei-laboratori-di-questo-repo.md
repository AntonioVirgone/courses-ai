# Per ora Heimdall si costruisce da zero nei laboratori di questo repo, senza riferimenti al repo heimdall

Dalla lezione 04 i laboratori costruiscono Heimdall da zero, in questo repo. Heimdall è il plugin `heimdall`, nel `lab/` della lezione che ne costruisce il primo pezzo, e il marketplace `courses-ai` lo pubblica come gli altri plugin dei laboratori (ADR-0002). Le lezioni non partono da uno stato del repo `heimdall` e non lo citano.

Il repo `heimdall` oggi è un progetto diverso da quello che il percorso descrive. È un'applicazione Python con un'orchestrazione propria, usa GitLab come forge e copre solo AppScan e Java. Non ha né un server MCP, né un backend simulato, né un plugin per Claude Code o Copilot. Partire da lì vorrebbe dire insegnare un'architettura diversa da quella delle lezioni 01–03, oppure cambiare prima un progetto che ha i suoi tempi e le sue decisioni. Costruire da zero tiene ogni lezione coerente con il percorso, e si segue con il solo repo `courses-ai`.

Diventa più facile seguire una lezione: tutto quello che serve è qui, e la soluzione si installa dal marketplace del repo. Diventa più difficile tenere distinti i due Heimdall. Quello dei corsi e il repo `heimdall` andranno avanti separati, e chi lavora a entrambi deve saperlo. Se e come riunirli si decide più avanti, con un ADR nuovo.

Di ADR-0003 resta in vigore il resto: il percorso porta a Heimdall, che funziona sia in Claude Code sia in Copilot CLI. Di ADR-0004 resta in vigore tutto, tranne il luogo della decisione sul backend reale: si prende in questo repo, a partire dalla lezione 04.

Come le lezioni dalla 05 in poi riprendono il plugin della lezione precedente si decide con la lezione 05.

## Considered Options

- **Partire dallo stato attuale del repo heimdall.** Scartato: è un'applicazione Python con un'architettura diversa da quella del percorso, senza server MCP né plugin.
- **Riallineare prima il repo heimdall al percorso.** Scartato per ora: ferma le lezioni finché non cambia un progetto che ha tempi e decisioni propri.
- **Un plugin didattico con un altro nome, come nelle lezioni 01–03.** Scartato: dalla lezione 04 il laboratorio costruisce il prodotto del percorso, non un esempio su `acme-shop`.
