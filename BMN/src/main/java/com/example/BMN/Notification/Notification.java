package com.example.BMN.Notification;

import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private SiteUser user;


    @Column(nullable = false)
    private String type; // FOLLOW_REQUEST, FOLLOW_APPROVED 등

    // 알림의 상대방(요청자/승인자) id를 저장
    private Long opponentId;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private boolean read = false;
}
