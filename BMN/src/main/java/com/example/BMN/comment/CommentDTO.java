package com.example.BMN.comment;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDTO {
    private Long id;
    private Long recipeId;

    private Long authorId;
    private String authorUserName;     // SiteUser.userName
    private String authorDisplayName;  // 우선순위: nickname → userName

    private String content;
    private Integer rating;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentDTO from(Comment c) {
        String userName = null;
        String displayName = null;

        if (c.getAuthor() != null) {
            // SiteUser: userName, nickname
            userName = c.getAuthor().getUserName();
            String nick = c.getAuthor().getNickname();
            displayName = (nick != null && !nick.isBlank()) ? nick : userName;
        } else {
            // 탈퇴한 사용자 (실제로는 댓글 삭제되지만 방어적 처리)
            displayName = "탈퇴한 사용자";
        }

        return CommentDTO.builder()
                .id(c.getId())
                .recipeId(c.getRecipe() != null ? c.getRecipe().getId() : null)
                .authorId(c.getAuthor() != null ? c.getAuthor().getId() : null)
                .authorUserName(userName)
                .authorDisplayName(displayName)
                .content(c.getContent())
                .rating(c.getRating())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}