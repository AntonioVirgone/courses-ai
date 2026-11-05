package com.acme.payments.statements;

public class InvalidStatementException extends RuntimeException {

    public InvalidStatementException(String message, Throwable cause) {
        super(message, cause);
    }
}
