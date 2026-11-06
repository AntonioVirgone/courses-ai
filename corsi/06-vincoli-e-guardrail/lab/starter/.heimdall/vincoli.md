# Vincoli di payments-api

I vincoli che Heimdall rispetta quando corregge un alert in questo progetto. Li scrive e li aggiorna il team che lo mantiene, con una pull request come il codice. Il Supervisor approva un piano solo se li rispetta tutti. Ogni vincolo ha un nome in grassetto: il verdetto lo cita così com'è.

1. **Java 8.** payments-api gira su Java 8 nei server della piattaforma pagamenti, e ci resta fino alla migrazione decisa dal team piattaforma. Il piano non cambia `java.version` nel `pom.xml` e non porta librerie che richiedono una versione di Java più recente.
2. **Dipendenze.** Nessuna dipendenza nuova. Cambia versione solo la libreria dell'alert. `com.acme.libs:acme-xml` è la libreria comune dei servizi di pagamento: un cambio di major, per esempio dalla 1.x alla 2.x, lo decide il team piattaforma, non Heimdall.
3. **Perimetro.** Il piano modifica solo il `pom.xml` e i file di `src/main/java` che usano la libreria dell'alert o contengono la riga segnalata, cioè quelli di `analysis.json`. Può aggiungere file nuovi in `src/test/`.
4. **Test esistenti.** I file in `src/test/`, risorse comprese, non si modificano, non si spostano e non si cancellano. Ogni correzione ha almeno un test nuovo, che fallisce prima della correzione e passa dopo.
5. **Nessuna scorciatoia.** Il piano non disattiva test o controlli: niente `@Disabled`, niente `-DskipTests`, niente esclusioni nello scanner. Non fa merge e non scrive su `main`: l'esito è una pull request da rivedere.
