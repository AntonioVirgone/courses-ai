---
alert: PAY-160644
version: 1
---
# Piano v1 · PAY-160644

## Pertinenza

Pertinente. `payments-api` dichiara `com.acme.libs:acme-xml` 1.4.2, la versione segnalata, e la usa per leggere gli estratti conto. Il metodo che li legge si raggiunge da `POST /api/statements`, che riceve il file XML dal cliente: chi carica l'estratto controlla il documento, comprese le entità esterne.

## Diagnosi

`StatementParser#parse` crea il lettore con `XmlReaderFactory.newReader()` (`src/main/java/com/acme/payments/statements/StatementParser.java:22`) e legge il file caricato con `reader.read(xml)` (riga 24). In acme-xml 1.4.2 un lettore creato così risolve le entità esterne. Un estratto con una `<!DOCTYPE>` che dichiara un'entità `SYSTEM "file:///…"` fa leggere al server un file locale (XXE, CWE-611).

`BankCodesLoader#load` usa la stessa libreria all'avvio (`src/main/java/com/acme/payments/banks/BankCodesLoader.java:27`), ma legge `bank-codes.xml` dal jar: nessun attaccante controlla quel documento.

## Evidenze

- `POST /api/statements`: `StatementController#upload` (`StatementController.java:34`) → `StatementImportService#importStatement` (`StatementImportService.java:24`) → `StatementParser#parse` (`StatementParser.java:22`). L'argomento è `file.getInputStream()` del `MultipartFile` caricato (`StatementController.java:33`).
- All'avvio (`@PostConstruct`): `BankCodesLoader#load` (`BankCodesLoader.java:27`), su una risorsa del jar.
- Dipendenza: `pom.xml:46-50`, diretta, scope compile. La versione sta nella proprietà `acme-xml.version` (`pom.xml:22`).
- Test che passano da `StatementParser#parse`: `StatementParserTest#readsCustomerAndLines` e `StatementParserTest#rejectsMalformedXml`.
- Controllato a mano: `analysis.json` non dà un tipo a `read` e `children` in `BankCodesLoader.java:27-28`, perché sono chiamate in catena. Nel file sono `XmlReader#read` e `XmlElement#children`.
- I due risultati di grep che non sono codice (`StatementController.java:37`, una stringa di log, e `StatementImportService.java:23`, un commento) non cambiano.

## Modifiche

1. In `pom.xml:22` portare `acme-xml.version` da `1.4.2` a `2.0.0`.
2. La 2.0.0 richiede Java 11: in `pom.xml:21` portare `java.version` da `1.8` a `11`.
3. La 2.0.0 toglie `XmlReaderFactory`. In `StatementParser.java:22` sostituire `XmlReaderFactory.newReader()` con `XmlReader.builder().build()`, e togliere l'import di `XmlReaderFactory` (riga 12).
4. In `BankCodesLoader.java:27` sostituire `XmlReaderFactory.newReader().read(in)` con `XmlReader.builder().build().read(in)`. Al posto dell'import di `XmlReaderFactory` (riga 14) importare `com.acme.xml.XmlReader`.
5. Aggiungere `src/test/java/com/acme/payments/statements/StatementParserXxeTest.java`. Il test legge un estratto con un'entità esterna che punta a un file temporaneo e verifica che il contenuto del file non compaia nell'estratto letto.
6. Aggiungere la risorsa di test `src/test/resources/statements/external-entity.xml`.

## File toccati

- `pom.xml`
- `src/main/java/com/acme/payments/statements/StatementParser.java`
- `src/main/java/com/acme/payments/banks/BankCodesLoader.java`
- `src/test/java/com/acme/payments/statements/StatementParserXxeTest.java` (nuovo)
- `src/test/resources/statements/external-entity.xml` (nuovo)

## Dipendenze

- `com.acme.libs:acme-xml` da 1.4.2 a 2.0.0.
- Java da 1.8 a 11, perché la 2.0.0 richiede Java 11 e nessuna versione corretta di acme-xml gira su Java 8.

## Test

- Restano come sono e devono passare: `StatementParserTest#readsCustomerAndLines`, `StatementParserTest#rejectsMalformedXml` e i test di `SessionCookieFilterTest`.
- Nuovo: `StatementParserXxeTest`, che fallisce con la 1.4.2 e passa con la 2.0.0.

## Rischi

- Il passaggio a Java 11 riguarda tutto il servizio, non solo il parser: l'immagine della CI, il JDK di build e il runtime dove gira `payments-api` devono essere Java 11 o successivi. Le altre dipendenze sono gestite dal parent `spring-boot-starter-parent` 2.7.18, che supporta Java 11.
- Il `pom.xml:36` dice che la 2.x richiede Java 11 e che per ora il progetto resta sulla 1.x. Il `pom.xml:43` chiede di sentire il team piattaforma prima di aggiornare acme-xml.
- Il cambio di API tocca anche `BankCodesLoader`, cioè l'avvio del servizio: un errore lì impedisce la partenza.

## Alternative

- **Restare sulla 1.4.2 e disattivare le entità esterne.** Dalla 1.3.0 `XmlReader.builder().resolveExternalEntities(false).build()` crea un lettore che non le risolve. Toglie la vulnerabilità senza cambiare Java, ma lo scanner continua a segnalare la 1.4.2. Non la propongo come prima scelta perché la versione corretta indicata dall'alert è la 2.0.0.
- **Correggere solo `StatementParser`.** Basterebbe per l'endpoint, ma con l'aggiornamento `XmlReaderFactory` sparisce anche da `BankCodesLoader`: i due file cambiano insieme.
