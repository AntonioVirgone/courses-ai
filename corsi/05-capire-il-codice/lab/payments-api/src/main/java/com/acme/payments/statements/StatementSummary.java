package com.acme.payments.statements;

public class StatementSummary {

    private final String customerId;
    private final int lines;
    private final long totalCents;

    private StatementSummary(String customerId, int lines, long totalCents) {
        this.customerId = customerId;
        this.lines = lines;
        this.totalCents = totalCents;
    }

    public static StatementSummary of(Statement statement) {
        long total = 0;
        for (StatementLine line : statement.getLines()) {
            total += line.getAmountCents();
        }
        return new StatementSummary(statement.getCustomerId(), statement.getLines().size(), total);
    }

    public String getCustomerId() {
        return customerId;
    }

    public int getLines() {
        return lines;
    }

    public long getTotalCents() {
        return totalCents;
    }
}
