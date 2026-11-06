---
alert: PAY-160644
version: 2
---
# Piano v2 · PAY-160644

## Pertinenza

Pertinente. `payments-api` dichiara `com.acme.libs:acme-xml` 1.4.2, la versione segnalata, e la usa per leggere gli estratti conto. Il metodo che li legge si raggiunge da `POST /api/statements`, che riceve il file XML dal cliente: chi carica l'estratto controlla il documento, comprese le entità esterne.

## Diagnosi

`StatementParser#parse` crea il lettore con `XmlReaderFactory.newReader()` (`src/main/java/com/acme/payments/statements/StatementParser.java:22`) e legge il file caricato con `reader.read(xml)` (riga 24). In acme-xml 1.4.2 un lettore creato così risolve le entità esterne. Un estratto con una `<!DOCTYPE>` che dichiara un'entità `SYSTEM "file:///…"` fa leggere al server un file locale (XXE, CWE-611).

`BankCodesLoader#load` crea un lettore allo stesso modo all'avvio (`src/main/java/com/acme/payments/banks/BankCodesLoader.java:27`), ma legge `bank-codes.xml` dal jar: nessun attaccante controlla quel documento.

## Evidenze

- `POST /api/statements`: `StatementController#upload` (`StatementController.java:34`) → `StatementImportService#importStatement` (`StatementImportService.java:24`) → `StatementParser#parse` (`StatementParser.java:22`). L'argomento è `file.getInputStream()` del `MultipartFile` caricato (`StatementController.java:33`).
- All'avvio (`@PostConstruct`): `BankCodesLoader#load` (`BankCodesLoader.java:27`), su una risorsa del jar.
- Dipendenza: `pom.xml:46-50`, diretta, scope compile. La versione sta nella proprietà `acme-xml.version` (`pom.xml:22`).
- La correzione senza aggiornare: secondo i metadati di acme-xml, la 1.3.0 aggiunge `XmlReader.builder()` e `XmlReader.Builder#resolveExternalEntities(boolean)`, con il valore predefinito `true`. La 1.4.2 li ha, e gira su Java 8.
- Test che passano da `StatementParser#parse`: `StatementParserTest#readsCustomerAndLines` e `StatementParserTest#rejectsMalformedXml`.
- Controllato a mano: `bank-codes.xml` non ha una `<!DOCTYPE>` né entità, quindi un lettore che non le risolve lo legge come prima.

## Modifiche

1. In `StatementParser.java:22` sostituire `XmlReaderFactory.newReader()` con `XmlReader.builder().resolveExternalEntities(false).build()`, e togliere l'import di `XmlReaderFactory` (riga 12).
2. In `BankCodesLoader.java:27` sostituire `XmlReaderFactory.newReader().read(in)` con `XmlReader.builder().resolveExternalEntities(false).build().read(in)`. Al posto dell'import di `XmlReaderFactory` (riga 14) importare `com.acme.xml.XmlReader`.
3. Aggiungere `src/test/java/com/acme/payments/statements/StatementParserXxeTest.java`. Il test legge un estratto con un'entità esterna che punta a un file temporaneo e verifica che il contenuto del file non compaia nell'estratto letto.
4. Aggiungere la risorsa di test `src/test/resources/statements/external-entity.xml`.

## File toccati

- `src/main/java/com/acme/payments/statements/StatementParser.java`
- `src/main/java/com/acme/payments/banks/BankCodesLoader.java`
- `src/test/java/com/acme/payments/statements/StatementParserXxeTest.java` (nuovo)
- `src/test/resources/statements/external-entity.xml` (nuovo)

## Dipendenze

Nessuna. `acme-xml` resta alla 1.4.2 e Java resta 1.8.

## Test

- Restano come sono e devono passare: `StatementParserTest#readsCustomerAndLines`, `StatementParserTest#rejectsMalformedXml` e i test di `SessionCookieFilterTest`.
- Nuovo: `StatementParserXxeTest`, che fallisce con `XmlReaderFactory.newReader()` e passa con `resolveExternalEntities(false)`.

## Rischi

- AppScan continuerà a segnalare acme-xml 1.4.2, perché guarda la versione nel `pom.xml`. Come chiudere l'alert, per esempio segnandolo come mitigato con il link alla pull request, lo decide chi la rivede.
- Se un domani qualcuno crea un lettore nuovo con `XmlReaderFactory.newReader()`, la vulnerabilità torna. Dopo questa modifica il progetto non usa più `XmlReaderFactory`: il passaggio alla 2.0.0, quando arriverà Java 11, cambierà solo il `pom.xml`.
- Il cambio tocca anche `BankCodesLoader`, cioè l'avvio del servizio: un errore lì impedisce la partenza.

## Alternative

- **acme-xml 2.0.0 con Java 11**, il piano v1. Rifiutato dal Supervisor: viola «Java 8» e «Dipendenze».
- **Correggere solo `StatementParser`.** Basterebbe per l'endpoint, ma lascerebbe in `BankCodesLoader` l'ultimo uso di `XmlReaderFactory` e un lettore che risolve le entità esterne.

## Risposta al verdetto v1

- **Java 8:** `java.version` resta 1.8. La correzione usa `resolveExternalEntities(false)`, che c'è dalla 1.3.0 e gira su Java 8.
- **Dipendenze:** `acme-xml` resta alla 1.4.2, nessuna dipendenza cambia e il `pom.xml` non si tocca. Il cambio di major resta al team piattaforma.
