package com.acme.payments.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Il registro di audit: una riga per evento.
 */
@Component
public class AuditLogger {

    private static final Logger audit = LoggerFactory.getLogger("audit");

    public void statementImported(String customerId, int lines) {
        audit.info("statement-imported customer={} lines={}", clean(customerId), lines);
    }

    // a capo e ritorno carrello diventano «_»: un valore non può aggiungere righe al registro
    static String clean(String value) {
        return value == null ? null : value.replaceAll("[\r\n]", "_");
    }
}
