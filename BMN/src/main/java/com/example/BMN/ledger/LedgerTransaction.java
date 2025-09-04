// src/main/java/com/example/BMN/ledger/LedgerTransaction.java
package com.example.BMN.ledger;

import com.example.BMN.User.SiteUser;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "ledger_transaction",
        indexes = {
                @Index(name="idx_author_date", columnList="author_id,date"),
                @Index(name="idx_date", columnList="date")
        })
public class LedgerTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false) private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false, length=10)
    private TransactionType type; // INCOME/EXPENSE

    @Column(nullable=false, length=200)
    private String name;

    @Column(nullable=false)
    private Long amount;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @JsonIgnore
    private SiteUser author;

    // getters/setters ...
    public Long getId(){return id;}
    public LocalDate getDate(){return date;}
    public TransactionType getType(){return type;}
    public String getName(){return name;}
    public Long getAmount(){return amount;}
    public SiteUser getAuthor(){return author;}
    public void setId(Long id){this.id=id;}
    public void setDate(LocalDate date){this.date=date;}
    public void setType(TransactionType type){this.type=type;}
    public void setName(String name){this.name=name;}
    public void setAmount(Long amount){this.amount=amount;}
    public void setAuthor(SiteUser author){this.author=author;}
}