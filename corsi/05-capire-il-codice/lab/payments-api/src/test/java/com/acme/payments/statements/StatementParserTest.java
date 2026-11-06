package com.acme.payments.statements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.InputStream;

import org.junit.jupiter.api.Test;

class StatementParserTest {

    private final StatementParser parser = new StatementParser();

    @Test
    void readsCustomerAndLines() {
        Statement statement = parser.parse(resource("/statements/two-lines.xml"));
        assertEquals("CUST-0042", statement.getCustomerId());
        assertEquals(2, statement.getLines().size());
        assertEquals(125000L, statement.getLines().get(0).getAmountCents());
    }

    @Test
    void rejectsMalformedXml() {
        assertThrows(InvalidStatementException.class, () -> parser.parse(resource("/statements/malformed.xml")));
    }

    private InputStream resource(String name) {
        return StatementParserTest.class.getResourceAsStream(name);
    }
}
