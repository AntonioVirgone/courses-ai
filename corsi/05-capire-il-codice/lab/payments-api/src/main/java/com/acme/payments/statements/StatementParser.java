package com.acme.payments.statements;

import java.io.InputStream;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.acme.xml.XmlDocument;
import com.acme.xml.XmlElement;
import com.acme.xml.XmlException;
import com.acme.xml.XmlReader;
import com.acme.xml.XmlReaderFactory;

/**
 * Legge un estratto conto nel formato XML della banca.
 * Gli importi arrivano in centesimi, come interi.
 */
@Component
public class StatementParser {

    public Statement parse(InputStream xml) {
        XmlReader reader = XmlReaderFactory.newReader();
        try {
            XmlDocument document = reader.read(xml);
            XmlElement root = document.getRoot();
            Statement statement = new Statement(root.attribute("customer"), LocalDate.parse(root.attribute("date")));
            for (XmlElement line : root.children("line")) {
                statement.addLine(toLine(line));
            }
            return statement;
        } catch (XmlException e) {
            throw new InvalidStatementException("Estratto conto non valido: " + e.getMessage(), e);
        }
    }

    private StatementLine toLine(XmlElement element) {
        return new StatementLine(
                element.attribute("iban"),
                Long.parseLong(element.attribute("amountCents")),
                element.text());
    }
}
