# Ogni lezione tiene nel suo lab/ il plugin heimdall completo, com'è alla fine del laboratorio

Dalla lezione 05, ogni lezione che fa avanzare Heimdall parte da una copia del plugin della lezione precedente. La copia sta in `lab/team-marketplace/plugins/heimdall/`, completa, ed è il plugin com'è alla fine di quel laboratorio. La voce `heimdall` del marketplace `courses-ai` punta alla copia dell'ultima lezione fatta. Le copie delle lezioni precedenti restano dove sono: sono lo stato di partenza della lezione successiva e non si aggiornano più, se non per correggere un errore che rompe il loro laboratorio. A ogni lezione `version` in `plugin.json` sale di una minor: 0.1.0 alla lezione 04, 0.2.0 alla 05.

Lo facciamo per tenere ogni lezione autonoma (ADR-0001). Le slide di una lezione mostrano i file del suo laboratorio, e i due devono coincidere. Con una sola cartella che le lezioni fanno avanzare, le slide della lezione 04 smetterebbero di coincidere con il plugin appena la 05 lo cambia. Con una copia per lezione, chi rifà la lezione 04 trova il plugin della 04, e chi ha perso la 04 parte dalla sua soluzione. Inoltre il confronto tra due copie mostra esattamente che cosa aggiunge una lezione:

```bash
diff -r corsi/04-connettere-i-sistemi/lab/team-marketplace/plugins/heimdall corsi/05-capire-il-codice/lab/team-marketplace/plugins/heimdall
```

Diventa più facile seguire e preparare una lezione, perché tutto quello che serve sta nella sua cartella. Diventa più difficile correggere un errore nei file comuni, come il server MCP o il normalizzatore. La correzione va nella copia più recente, e in quelle precedenti solo se l'errore ne rompe il laboratorio. ADR-0001 accettava di duplicare il materiale tra corsi «finché i casi restano pochi». Qui la duplicazione è voluta e cresce di una copia a lezione, fino alla 09: circa trenta file piccoli per copia, senza dipendenze. Il nome del plugin resta `heimdall` in tutte le copie, quindi chi ne installa una per un laboratorio disinstalla prima le altre.

## Considered Options

- **Una sola cartella del plugin, che le lezioni fanno avanzare.** Scartato: le slide e i laboratori delle lezioni precedenti non coincidono più con i file, e chi rifà una lezione trova il plugin di un'altra.
- **Nel lab/ di ogni lezione solo i file nuovi o cambiati.** Scartato: il plugin non si installa da una sola cartella, e il marketplace dovrebbe ricomporlo da più lezioni.
- **Un tag git per ogni lezione.** Scartato: la lezione non si segue più dalla sola cartella del corso, e le voci del marketplace dovrebbero puntare a un riferimento git invece che a un percorso del repo.
