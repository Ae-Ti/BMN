package com.example.BMN.User;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Getter
@Setter
public class PendingRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String token;

    @Column(nullable = false)
    private String userName;

    @Column(nullable = false)
    private String email;

    // store password hash to avoid keeping plaintext
    @Column(nullable = false)
    private String passwordHash;

    private String nickname;
    @Column(columnDefinition = "TEXT")
    private String introduction;
    private LocalDate dateOfBirth;
    private String sex;

    private Instant createdAt = Instant.now();
    private Instant expiryAt;
}
