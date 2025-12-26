package com.example.BMN.User;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class FollowRequestDTO {
    private Long id;
    private String userName;
    private String nickname;
    private LocalDateTime createdAt;

    public static FollowRequestDTO fromEntity(FollowRequest fr) {
        FollowRequestDTO dto = new FollowRequestDTO();
        dto.setId(fr.getRequester().getId());
        dto.setUserName(fr.getRequester().getUserName());
        dto.setNickname(fr.getRequester().getNickname());
        dto.setCreatedAt(fr.getCreatedAt());
        return dto;
    }
}
