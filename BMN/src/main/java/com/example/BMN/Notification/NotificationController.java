package com.example.BMN.Notification;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
        @PostMapping("/{id}/approve")
        public ResponseEntity<?> approveFollowRequest(@PathVariable Long id) {
            SiteUser me = userService.currentUserOrThrow();
            Notification n = notificationService.getByIdAndUser(id, me);
            if (!"FOLLOW_REQUEST".equals(n.getType())) {
                return ResponseEntity.badRequest().body("해당 알림은 승인할 수 없습니다.");
            }
            // 요청자 username 추출 (message 파싱이 아니라, Notification에 요청자 username을 저장하는 것이 더 안전하나, 여기서는 userName만 사용)
            // 실제로는 FollowRequest에서 찾아야 함
            com.example.BMN.User.FollowRequest fr = notificationService.findPendingFollowRequestForNotification(n);
            if (fr == null) return ResponseEntity.badRequest().body("요청을 찾을 수 없습니다.");
            userService.approveRequest(fr.getRequester().getUserName());
            notificationService.delete(n);
            return ResponseEntity.ok().build();
        }

        @PostMapping("/{id}/reject")
        public ResponseEntity<?> rejectFollowRequest(@PathVariable Long id) {
            SiteUser me = userService.currentUserOrThrow();
            Notification n = notificationService.getByIdAndUser(id, me);
            if (!"FOLLOW_REQUEST".equals(n.getType())) {
                return ResponseEntity.badRequest().body("해당 알림은 거부할 수 없습니다.");
            }
            com.example.BMN.User.FollowRequest fr = notificationService.findPendingFollowRequestForNotification(n);
            if (fr == null) return ResponseEntity.badRequest().body("요청을 찾을 수 없습니다.");
            userService.rejectRequest(fr.getRequester().getUserName());
            notificationService.delete(n);
            return ResponseEntity.ok().build();
        }

        // 알림 삭제(확인 버튼)
        @PostMapping("/{id}/delete")
        public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
            SiteUser me = userService.currentUserOrThrow();
            Notification n = notificationService.getByIdAndUser(id, me);
            notificationService.delete(n);
            return ResponseEntity.ok().build();
        }
    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping
    public List<NotificationDTO> getMyNotifications() {
        SiteUser me = userService.currentUserOrThrow();
        List<Notification> notifications = notificationService.getNotifications(me);
        return notifications.stream().map(n -> {
            SiteUser opponent = null;
            // 단순화: opponentId만 사용, 필요시 SiteUser 조회
            if (n.getOpponentId() != null) {
                opponent = userService.getById(n.getOpponentId());
            }
            return NotificationDTO.fromEntity(n, opponent);
        }).toList();
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        SiteUser me = userService.currentUserOrThrow();
        notificationService.markAsRead(id, me);
        return ResponseEntity.ok().build();
    }
}
