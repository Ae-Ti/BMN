package com.example.BMN.ledger;

import java.util.List;

public record LedgerSummaryResponse(
        String period,
        String startDate,
        String endDate,
        long income,
        long expense,
        long net,
        List<TransactionView> transactions
) {
    public record TransactionView(Long id, String date, TransactionType type, String name, Long amount) {}
}
