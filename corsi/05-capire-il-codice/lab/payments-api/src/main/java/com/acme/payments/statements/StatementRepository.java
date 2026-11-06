package com.acme.payments.statements;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Repository;

/**
 * Gli estratti importati, in memoria: nel progetto di esempio non c'è un database.
 */
@Repository
public class StatementRepository {

    private final Map<String, List<Statement>> byCustomer = new ConcurrentHashMap<>();

    public void save(Statement statement) {
        byCustomer.computeIfAbsent(statement.getCustomerId(), id -> new CopyOnWriteArrayList<>()).add(statement);
    }

    public List<Statement> findByCustomer(String customerId) {
        return byCustomer.getOrDefault(customerId, new CopyOnWriteArrayList<>());
    }
}
