package com.acme.payments.statements;

public class StatementLine {

    private final String iban;
    private final long amountCents;
    private final String description;

    public StatementLine(String iban, long amountCents, String description) {
        this.iban = iban;
        this.amountCents = amountCents;
        this.description = description;
    }

    public String getIban() {
        return iban;
    }

    public long getAmountCents() {
        return amountCents;
    }

    public String getDescription() {
        return description;
    }
}
