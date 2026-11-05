package com.acme.payments.banks;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.PostConstruct;

import org.springframework.stereotype.Component;

import com.acme.xml.XmlDocument;
import com.acme.xml.XmlElement;
import com.acme.xml.XmlReaderFactory;

/**
 * Carica all'avvio i nomi delle banche dal file bank-codes.xml, che sta nel jar.
 */
@Component
public class BankCodesLoader {

    private final Map<String, String> names = new HashMap<>();

    @PostConstruct
    void load() throws IOException {
        try (InputStream in = BankCodesLoader.class.getResourceAsStream("/bank-codes.xml")) {
            XmlDocument document = XmlReaderFactory.newReader().read(in);
            for (XmlElement bank : document.getRoot().children("bank")) {
                names.put(bank.attribute("abi"), bank.text());
            }
        }
    }

    public String nameOf(String abi) {
        return names.getOrDefault(abi, "banca sconosciuta");
    }
}
