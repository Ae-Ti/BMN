package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, Long> {
    Optional<PendingRegistration> findByToken(String token);
    Optional<PendingRegistration> findByEmail(String email);
    void deleteByToken(String token);
    boolean existsByUserName(String userName);
    boolean existsByEmail(String email);
}
