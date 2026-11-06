# I vincoli di un progetto stanno nel suo repo, in .heimdall/vincoli.md

I vincoli che Heimdall rispetta quando corregge un alert stanno nel repo del progetto, nel file `.heimdall/vincoli.md` alla radice. Li scrive il team che mantiene il progetto e li cambia con una pull request, come il codice. Ogni vincolo è una voce numerata con il nome in grassetto e il motivo, per esempio «**Java 8.** payments-api gira su Java 8 nei server della piattaforma pagamenti…». Il Supervisor legge il file e cita i vincoli per nome nel verdetto. L'hook `guard-pipeline` legge gli stessi nomi e pretende che il verdetto li controlli tutti. Gli agenti non scrivono in `.heimdall/`: lo stesso hook lo impedisce.

Il file serve anche a un'altra cosa: dice che il progetto è seguito da Heimdall. Gli hook `guard-tests` e `guard-git` intervengono solo nei progetti che hanno `.heimdall/vincoli.md`. Così il plugin installato non cambia il lavoro sugli altri progetti.

Lo facciamo perché i vincoli dipendono dal progetto e cambiano con il suo codice. Java 8 vale per `payments-api`, non per `orders-service`. Quando la piattaforma passerà a Java 11, il team cambierà il vincolo nella stessa pull request che cambia il `pom.xml`, e Heimdall lo saprà dal giro successivo. Chi conosce i limiti del progetto è il team che lo mantiene, e la review del file è la stessa del codice. È lo stesso modello di `CLAUDE.md`: un file del progetto, letto dall'agente, rivisto dalle persone.

Diventa più facile per un team adottare Heimdall: basta un file nel repo, senza toccare il plugin o il server MCP. Diventa più difficile avere vincoli comuni a più progetti, per esempio una regola della piattaforma pagamenti: ogni repo ne tiene una copia, e una regola comune va aggiornata in tutti. Se le copie diventeranno un problema, si valuterà un file comune nel backend reale, con un ADR nuovo. Il nome della cartella è `.heimdall/` e non `.pipeline/`: `.pipeline/` contiene gli artefatti di un giro su un alert, e i vincoli non appartengono a un giro.

## Considered Options

- **In `.pipeline/vincoli.md`, come nel corso 03.** Scartato: `.pipeline/` è la cartella degli artefatti dei giri, e mescola input del team e output degli agenti.
- **Nel plugin, con una sezione per progetto.** Scartato: il plugin serve tutti i progetti, e cambiare un vincolo vorrebbe dire rilasciare una versione nuova di Heimdall.
- **Dal server MCP, nella configurazione del backend.** Scartato: il server MCP collega Heimdall ai sistemi esterni, mentre i vincoli cambiano con il codice del progetto e vanno rivisti dal suo team.
- **In `CLAUDE.md` o `AGENTS.md`, insieme alle istruzioni del progetto.** Scartato: sono istruzioni per qualsiasi agente, lette in ogni sessione. I vincoli di Heimdall servono al Supervisor e agli hook, e devono avere un formato che un programma sa leggere.
