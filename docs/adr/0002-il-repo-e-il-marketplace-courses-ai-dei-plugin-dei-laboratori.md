# Il repo è il marketplace courses-ai dei plugin dei laboratori

Il repo pubblica i plugin costruiti nei laboratori come marketplace `courses-ai`. Il catalogo sta in `.claude-plugin/marketplace.json` alla radice. Ogni voce punta con un percorso relativo al plugin dentro il `lab/` del suo corso, per esempio `./corsi/01-skill-e-plugin/lab/team-marketplace/plugins/team-toolkit`. Il team installa con `claude plugin marketplace add AntonioVirgone/courses-ai` e poi `team-toolkit@courses-ai`. Con Copilot CLI si usano gli stessi argomenti con `copilot plugin`.

Lo facciamo perché il laboratorio diventi qualcosa che si installa davvero, non solo codice nelle slide. Il plugin esiste in una sola copia, quella del corso (ADR-0001). Il marketplace di radice è solo un catalogo che la cita, quindi non c'è niente da tenere allineato. I plugin sono didattici: codificano le convenzioni del progetto di esempio `acme-shop`, non quelle di un progetto reale.

Il catalogo esiste in un solo file, `.claude-plugin/marketplace.json`. Copilot CLI cerca il manifest del marketplace anche in `.claude-plugin/`, dopo `marketplace.json`, `.plugin/` e `.github/plugin/`. Lo dice il riferimento dei plugin della CLI su docs.github.com. Una copia in `.github/plugin/` quindi non serve e rischierebbe di disallinearsi. La documentazione di VS Code invece non dice dove cerca il file. Se in prova VS Code non lo trova, aggiungeremo la copia con un controllo in CI, in un ADR che supera questo.

Il manifest di ogni plugin resta in `.claude-plugin/plugin.json`, nel formato che leggono sia Claude Code sia Copilot. Non aggiungiamo un `plugin.json` alla radice del plugin con lo `$schema` di Agent Plugins. Per Copilot avrebbe la precedenza su `.claude-plugin/plugin.json` e cambierebbe dove vengono cercati agenti e hook.

Diventa più facile per il team installare e aggiornare i plugin dei corsi, e per chi fa il laboratorio confrontare il proprio lavoro con la soluzione installata. Diventa più difficile cambiare i percorsi dentro `lab/`: spostare il plugin rompe la voce del catalogo, e lo script di validazione lo segnala. Chi aggiunge il marketplace scarica tutto il repo, presentazioni comprese: sono pochi file e lo accettiamo. Il repo è privato, quindi installa solo chi ha accesso in lettura.

## Considered Options

- **Un repo separato `team-marketplace`.** Scartato: un secondo repo da tenere allineato con il corso, e la soluzione del laboratorio vivrebbe lontano dalle slide che la spiegano.
- **Plugin in `plugins/` alla radice.** Scartato: il corso non sarebbe più autonomo, oppure il plugin esisterebbe in due copie.
- **Copia del catalogo in `.github/plugin/marketplace.json`.** Rimandato a una verifica con VS Code: per Copilot CLI non serve.
- **Nessun marketplace.** Scartato: il laboratorio resterebbe un esercizio da rifare a mano su ogni macchina.
