package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PendingEmailChangeRepository extends JpaRepository<PendingEmailChange, Long> {
    Optional<PendingEmailChange> findByToken(String token);
    Optional<PendingEmailChange> findByUserId(Long userId);
    
    @Modifying
    @Query("DELETE FROM PendingEmailChange p WHERE p.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
    
    boolean existsByNewEmail(String newEmail);
}
