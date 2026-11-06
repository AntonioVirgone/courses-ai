package com.acme.payments.statements;

import java.io.IOException;
import java.io.InputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Caricamento degli estratti conto in XML da parte dei clienti business.
 */
@RestController
@RequestMapping("/api/statements")
public class StatementController {

    private static final Logger log = LoggerFactory.getLogger(StatementController.class);

    private final StatementImportService importService;

    public StatementController(StatementImportService importService) {
        this.importService = importService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<StatementSummary> upload(@RequestParam("file") MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            Statement statement = importService.importStatement(in);
            return ResponseEntity.status(HttpStatus.CREATED).body(StatementSummary.of(statement));
        } catch (IOException | InvalidStatementException e) {
            log.warn("Estratto rifiutato da XmlReader: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
