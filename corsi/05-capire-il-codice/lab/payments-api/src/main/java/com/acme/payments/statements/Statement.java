package com.acme.payments.statements;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Statement {

    private final String customerId;
    private final LocalDate date;
    private final List<StatementLine> lines = new ArrayList<>();

    public Statement(String customerId, LocalDate date) {
        this.customerId = customerId;
        this.date = date;
    }

    public void addLine(StatementLine line) {
        lines.add(line);
    }

    public String getCustomerId() {
        return customerId;
    }

    public LocalDate getDate() {
        return date;
    }

    public List<StatementLine> getLines() {
        return Collections.unmodifiableList(lines);
    }
}
