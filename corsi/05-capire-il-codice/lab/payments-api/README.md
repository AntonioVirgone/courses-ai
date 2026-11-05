# payments-api

Il progetto di esempio dello scenario Java 8 di Heimdall: un servizio Spring Boot 2.7 che riceve dai clienti business gli estratti conto in XML. Lo usano i laboratori dalla lezione 05 in poi. I dati sono inventati (ADR-0004).

- `POST /api/statements` riceve un file XML e lo legge con `StatementParser`.
- All'avvio `BankCodesLoader` legge `bank-codes.xml`, che sta nel jar.
- `SessionCookieFilter` assegna il cookie di sessione.

Il codice non si compila: `com.acme.libs:acme-xml` è una libreria inventata e non esiste in nessun repository Maven. Heimdall lo legge, non lo esegue.
