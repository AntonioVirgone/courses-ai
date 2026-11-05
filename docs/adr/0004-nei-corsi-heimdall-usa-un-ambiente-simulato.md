# Nei corsi Heimdall usa un ambiente simulato; l'accesso ai sistemi reali si configura solo in locale

Durante le lezioni Heimdall non si collega ad AppScan, SonarQube e Azure DevOps aziendali, ma a un ambiente simulato. Gli agenti raggiungono i sistemi esterni solo attraverso il server MCP di Heimdall, con strumenti stabili (per esempio: elenco degli alert nello schema comune, apertura di una pull request, stato e log di una pipeline). Dietro quel server ci sono due backend intercambiabili:
- **simulato**: legge i dati di scenari preparati, come i tre della demo (Java 8, Spring Boot con Java 21, Angular 21), e restituisce esiti di CI prestabiliti, compreso un fallimento da correggere;
- **reale**: chiama le API aziendali con le credenziali di chi lo esegue.

Si sceglie il backend con la configurazione, senza modificare agenti, skill o prompt.

Lo facciamo per tre motivi. Ogni partecipante può seguire le lezioni senza permessi sui sistemi aziendali. Gli scenari sono ripetibili: lo stesso alert porta sempre allo stesso rifiuto del Supervisor e allo stesso errore di CI, quindi le eval hanno un riferimento fisso. E nessun dato reale di progetto entra nei repo. Dopo il corso ognuno configura il backend reale sulla propria macchina, con i propri accessi.

Credenziali, URL interni e dati reali non entrano mai nei repo: stanno in variabili d'ambiente o in un file di configurazione locale ignorato da git. I dati degli scenari simulati sono inventati.

Diventa più facile insegnare e misurare Heimdall, e cambiare sistema in futuro, perché gli agenti dipendono da un contratto e non da un'API specifica. Diventa più difficile mantenere il backend simulato fedele a quello reale: la lezione 09 prevede una prova con il backend reale, per scoprire le differenze. Come è fatto il backend reale, per esempio se usa i server MCP ufficiali di Azure DevOps e SonarQube o le API REST, si decide nel repo `heimdall` durante la lezione 04.

## Considered Options

- **Istanze sandbox dei servizi aziendali per il corso.** Scartato: richiedono permessi e manutenzione, e gli scenari non sono ripetibili.
- **Agenti collegati direttamente ai server MCP ufficiali, con un simulatore che ne imita gli strumenti.** Scartato: lega i prompt ai nomi degli strumenti di server di terzi, e per AppScan non abbiamo verificato che esista un server MCP ufficiale.
- **Solo mock dentro le eval.** Scartato: le eval girano solo in Claude Code, mentre le lezioni devono funzionare anche in Copilot CLI.
