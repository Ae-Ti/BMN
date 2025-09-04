package com.example.BMN.ledger;

import com.example.BMN.User.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, Long> {

    List<LedgerTransaction> findAllByAuthorAndDate(SiteUser author, LocalDate date);

    List<LedgerTransaction> findAllByAuthorAndDateBetween(SiteUser author, LocalDate start, LocalDate end);

    Optional<LedgerTransaction> findByIdAndAuthor(Long id, SiteUser author);

    long deleteByIdAndAuthor(Long id, SiteUser author);
}