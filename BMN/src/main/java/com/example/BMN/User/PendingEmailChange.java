package com.example.BMN.User;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 이메일 변경 요청을 저장하는 엔티티
 * 새 이메일로 인증 토큰을 보내고, 인증 완료 시 실제 이메일 변경
 */
@Getter
@Setter
@Entity
@Table(name = "pending_email_change")
public class PendingEmailChange {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 이메일을 변경하려는 사용자 ID */
    @Column(nullable = false)
    private Long userId;

    /** 새로 변경하려는 이메일 주소 */
    @Column(nullable = false)
    private String newEmail;

    /** 인증 토큰 */
    @Column(nullable = false, unique = true)
    private String token;

    /** 요청 생성 시각 */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** 토큰 만료 시각 (24시간 후) */
    @Column(nullable = false)
    private LocalDateTime expiresAt;
}
