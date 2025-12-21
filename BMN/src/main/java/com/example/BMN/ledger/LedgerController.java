package com.example.BMN.ledger;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    private final LedgerService service;
    public LedgerController(LedgerService service) { this.service = service; }

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    @PostMapping("/transactions")
    public ResponseEntity<LedgerTransaction> create(@RequestBody Map<String, Object> body) {
        LocalDate date = LocalDate.parse(String.valueOf(body.get("date")), ISO);
        TransactionType type = TransactionType.valueOf(String.valueOf(body.get("type")).toUpperCase());
        String name = String.valueOf(body.get("name"));
        long amount = Long.parseLong(String.valueOf(body.get("amount")));
        return ResponseEntity.ok(service.create(date, type, name, amount));
    }

    @GetMapping("/transactions")
    public List<LedgerTransaction> listByDate(@RequestParam String date) {
        return service.listByDate(LocalDate.parse(date, ISO));
    }

    @PatchMapping("/transactions/{id}")
    public LedgerTransaction patch(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        TransactionType type = body.get("type") != null
                ? TransactionType.valueOf(String.valueOf(body.get("type")).toUpperCase()) : null;
        String name = body.get("name") != null ? String.valueOf(body.get("name")) : null;
        Long amount = body.get("amount") != null ? Long.parseLong(String.valueOf(body.get("amount"))) : null;
        LocalDate newDate = body.get("date") != null ? LocalDate.parse(String.valueOf(body.get("date")), ISO) : null;
        return service.patch(id, type, name, amount, newDate);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/calendar")
    public Map<String, Object> monthTotals(@RequestParam int year, @RequestParam int month) {
        return service.monthTotals(year, month);
    }

    @GetMapping("/summary")
    public LedgerSummaryResponse summary(@RequestParam String date, @RequestParam(defaultValue = "month") String period) {
        return service.summary(LocalDate.parse(date, ISO), period);
    }
}