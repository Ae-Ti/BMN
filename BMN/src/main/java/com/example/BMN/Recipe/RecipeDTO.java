package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import lombok.Data;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 프론트 응답용 DTO (엔티티 필드명과 1:1 매핑 정합성 확보)
 */
@Data
public class RecipeDTO {
    private Long id;
    private String subject;
    private String description;
    private String tools;
    private String content;
    private Integer cookingTimeMinutes;
    private Integer estimatedPrice;

    // 작성자 표시용
    private Long authorId;
    private String authorUsername;      // SiteUser.userName 매핑
    private String authorDisplayName;   // 닉네임 필드가 있으면 매핑(없으면 null)

    // 썸네일 URL (있을 때만)
    private String thumbnailUrl;

    // 재료: 엔티티의 ingredientRows 컬렉션을 그대로 변환
    private List<IngredientRowDTO> ingredientRows;

    // 조리 단계 이미지
    private List<StepImageDTO> stepImages;

    public RecipeDTO(Recipe r) {
        this.id = r.getId();
        this.subject = r.getSubject();
        this.description = r.getDescription();
        this.tools = r.getTools();
        this.content = r.getContent();
        this.cookingTimeMinutes = r.getCookingTimeMinutes();
        this.estimatedPrice = r.getEstimatedPrice();

        // 작성자
        SiteUser a = r.getAuthor();
        if (a != null) {
            this.authorId = a.getId();
            // ⚠️ SiteUser는 getUserName() (대/소문자 주의)
            this.authorUsername = a.getUserName();
            // 닉네임 필드가 있다면 여기에 매핑, 없으면 null 유지
            // this.authorDisplayName = a.getNickname();
        }

        // 썸네일 URL
        if (r.getThumbnail() != null && r.getThumbnail().length > 0) {
            this.thumbnailUrl = "/recipe/thumbnail/" + r.getId();
        }

        // 재료 rows
        this.ingredientRows = (r.getIngredientRows() == null) ? List.of()
                : r.getIngredientRows().stream()
                .map(IngredientRowDTO::new)
                .collect(Collectors.toList());

        // 스텝 이미지
        this.stepImages = (r.getStepImages() == null) ? List.of()
                : r.getStepImages().stream()
                .map(StepImageDTO::new)
                .collect(Collectors.toList());
    }

    /* ---------- Nested DTOs ---------- */

    @Data
    public static class IngredientRowDTO {
        private Long id;
        private String name;      // 원본명
        private String nameNorm;  // 정규화명
        private String link;      // 구매 링크
        private Integer position;

        public IngredientRowDTO(RecipeIngredient e) {
            this.id = e.getId();
            this.name = e.getName();
            this.nameNorm = e.getNameNorm();
            this.link = e.getLink();
            this.position = e.getPosition();
        }
    }

    @Data
    public static class StepImageDTO {
        private Long id;
        private Integer stepOrder;   // 프론트 호환: 엔티티 stepIndex → stepOrder로 노출
        private String description;  // 프론트 호환: 엔티티 caption → description로 노출
        private String imageUrl;

        public StepImageDTO(RecipeStepImage s) {
            this.id = s.getId();
            this.stepOrder = s.getStepIndex();     // ✅ 엔티티 stepIndex 매핑
            this.description = s.getCaption();     // ✅ 엔티티 caption 매핑
            if (s.getImage() != null && s.getImage().length > 0) {
                this.imageUrl = "/recipe/steps/" + s.getId() + "/image";
            }
        }
    }
}