
package com.example.BMN.Notification;
import com.example.BMN.User.SiteUser;

import java.time.LocalDateTime;

public class NotificationDTO {
    // 상대방 정보 (예: 팔로우 요청이면 요청자, 승인 알림이면 승인자)
    public String opponentUserName;
    public String opponentNickname;
    public Long opponentUserId;
    public String opponentDisplayName; // 닉네임(아이디) 형식
    public Long id;
    public String type;
    public String message;
    public boolean read;
    public LocalDateTime createdAt;
    public String userName;
    public String nickname;
    public Long userId;
    public Long opponentId;

    public static NotificationDTO fromEntity(Notification n, SiteUser opponent) {
        NotificationDTO dto = new NotificationDTO();
        dto.id = n.getId();
        dto.type = n.getType();
        dto.message = n.getMessage();
        dto.read = n.isRead();
        dto.createdAt = n.getCreatedAt();
        if (n.getUser() != null) {
            dto.userName = n.getUser().getUserName();
            dto.nickname = n.getUser().getNickname();
            dto.userId = n.getUser().getId();
        }
        dto.opponentId = n.getOpponentId();
        if (opponent != null) {
            dto.opponentUserName = opponent.getUserName();
            dto.opponentNickname = opponent.getNickname();
            dto.opponentUserId = opponent.getId();
            if (opponent.getNickname() != null && !opponent.getNickname().isBlank() && opponent.getUserName() != null && !opponent.getUserName().isBlank()) {
                dto.opponentDisplayName = opponent.getNickname() + "(" + opponent.getUserName() + ")";
            } else if (opponent.getNickname() != null && !opponent.getNickname().isBlank()) {
                dto.opponentDisplayName = opponent.getNickname();
            } else if (opponent.getUserName() != null && !opponent.getUserName().isBlank()) {
                dto.opponentDisplayName = opponent.getUserName();
            } else {
                dto.opponentDisplayName = "";
            }
        }
        return dto;
    }
}