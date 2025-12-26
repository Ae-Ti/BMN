package com.example.BMN.Notification;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.FollowRequest;
import com.example.BMN.User.FollowRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@RequiredArgsConstructor
@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final FollowRequestRepository followRequestRepository;
    public Notification getByIdAndUser(Long id, SiteUser user) {
        return notificationRepository.findById(id)
                .filter(n -> n.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new RuntimeException("알림을 찾을 수 없습니다."));
    }

    @Transactional
    public void delete(Notification n) {
        notificationRepository.delete(n);
    }

    // 알림에 연결된 FollowRequest를 상태 상관없이 찾음
    public FollowRequest findFollowRequestForNotification(Notification n) {
        if (n.getOpponentId() != null) {
            // 요청자 id만으로 가장 최근 PENDING FollowRequest 1건 반환
            return followRequestRepository.findTopByRequesterIdAndStatusOrderByCreatedAtDesc(n.getOpponentId(), com.example.BMN.User.FollowRequest.Status.PENDING).orElse(null);
        }
        return null;
    }

    // 알림에 연결된 PENDING 상태의 FollowRequest만 찾음 (기존 호환)
    public FollowRequest findPendingFollowRequestForNotification(Notification n) {
        FollowRequest fr = findFollowRequestForNotification(n);
        if (fr != null && fr.getStatus() == FollowRequest.Status.PENDING) return fr;
        return null;
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Transactional
    public void notify(SiteUser user, String type, String message) {
        notify(user, type, message, null);
    }

    @Transactional
    public void notify(SiteUser user, String type, String message, Long opponentId) {
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(NotificationService.class);
        System.out.println("[DEBUG] NotificationService.notify called: user=" + (user != null ? user.getUserName() : "null") + ", message=" + message);
        if (user == null) {
            System.out.println("[ERROR] NotificationService.notify: user is null! Notification will not be saved.");
            return;
        }
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setMessage(message);
        n.setOpponentId(opponentId);
        Notification saved = notificationRepository.save(n);
        try {
            entityManager.flush();
        } catch (Exception e) {
            System.out.println("[ERROR] NotificationService.notify: flush failed: " + e.getMessage());
            e.printStackTrace();
        }
        log.info("[NotificationService] Created notification: id={}, type={}, userId={}, userName={}, message={}",
                saved.getId(), type, user.getId(), user.getUserName(), message);
    }

    public List<Notification> getNotifications(SiteUser user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public void markAsRead(Long notificationId, SiteUser user) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().equals(user)) n.setRead(true);
        });
    }
}
