package com.acme.payments.statements;

import java.io.InputStream;

import org.springframework.stereotype.Service;

import com.acme.payments.audit.AuditLogger;

@Service
public class StatementImportService {

    private final StatementParser parser;
    private final StatementRepository repository;
    private final AuditLogger audit;

    public StatementImportService(StatementParser parser, StatementRepository repository, AuditLogger audit) {
        this.parser = parser;
        this.repository = repository;
        this.audit = audit;
    }

    public Statement importStatement(InputStream xml) {
        // XmlReader non è thread-safe: StatementParser ne crea uno per ogni estratto
        Statement statement = parser.parse(xml);
        repository.save(statement);
        audit.statementImported(statement.getCustomerId(), statement.getLines().size());
        return statement;
    }
}
