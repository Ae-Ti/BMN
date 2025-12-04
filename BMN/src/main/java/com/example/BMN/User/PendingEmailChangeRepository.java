package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingEmailChangeRepository extends JpaRepository<PendingEmailChange, Long> {
    Optional<PendingEmailChange> findByToken(String token);
    Optional<PendingEmailChange> findByUserId(Long userId);
    void deleteByUserId(Long userId);
    boolean existsByNewEmail(String newEmail);
}
