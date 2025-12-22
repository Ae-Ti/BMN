// src/main/java/com/example/BMN/Recipe/RecipeDTO.java
package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import lombok.Data;
import org.hibernate.Hibernate;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 프론트 응답용 DTO (엔티티 필드명과 1:1 정합성 + 파생 필드 포함)
 * - 엔티티에 없는 content 제거
 * - 즐겨찾기/조회수/평점 정보 포함
 * - "내가 즐겨찾기 했는지" 여부(favoritedByMe) 포함
 */
@Data
public class RecipeDTO {
    private Long id;
    private String subject;
    private String description;
    private String tools;
    private Integer cookingTimeMinutes;
    private Integer estimatedPrice;
    private java.time.LocalDateTime createDate;

    // 작성자 표시용
    private Long authorId;
    private String authorUsername;      // SiteUser.userName
    private String authorDisplayName;   // 닉네임 필드가 있으면 매핑(없으면 null)

    // 미디어
    private String thumbnailUrl;

    // 메타
    private Double averageRating;   // 정규화된 평균 별점
    private Integer ratingCount;    // 평점 개수
    private Integer favoriteCount;  // 즐겨찾기 수
    private Long viewCount;         // 조회수
    private Boolean favoritedByMe;  // 현재 로그인 사용자가 즐겨찾기 했는지

    // 재료/스텝
    private List<IngredientRowDTO> ingredientRows;
    private List<StepImageDTO> stepImages;

    /* --------- 생성자 --------- */

    // 로그인 사용자 정보가 없을 때(비로그인/옵셔널)
    public RecipeDTO(Recipe r) {
        this(r, null);
    }

    // 로그인 사용자(me)를 받아 favoritedByMe 계산
    public RecipeDTO(Recipe r, SiteUser me) {
        this.id = r.getId();
        this.subject = r.getSubject();
        this.description = r.getDescription();
        this.tools = r.getTools();
        this.cookingTimeMinutes = r.getCookingTimeMinutes();
        this.estimatedPrice = r.getEstimatedPrice();
        this.createDate = r.getCreateDate();

        // 작성자
        SiteUser a = r.getAuthor();
        if (a != null && Hibernate.isInitialized(a)) {
            this.authorId = a.getId();
            this.authorUsername = a.getUserName();
            // 닉네임이 있으면 닉네임, 없으면 userName 사용
            this.authorDisplayName = (a.getNickname() != null && !a.getNickname().isBlank()) 
                    ? a.getNickname() : a.getUserName();
        } else {
            // 탈퇴한 사용자
            this.authorId = null;
            this.authorUsername = null;
            this.authorDisplayName = "탈퇴한 사용자";
        }

        // 썸네일 URL
        if (r.getThumbnail() != null && r.getThumbnail().length > 0) {
            this.thumbnailUrl = "/recipe/thumbnail/" + r.getId();
        }

        // 메타
        this.averageRating = Optional.ofNullable(r.getAverageRating()).orElse(0.0);
        this.ratingCount   = Optional.ofNullable(r.getRatingCount()).orElse(0);
        this.favoriteCount = Optional.ofNullable(r.getFavoriteCount()).orElse(0);
        this.viewCount     = Optional.ofNullable(r.getViewCount()).orElse(0L);

        // 내가 즐겨찾기 했는지
        if (me != null && me.getFavorite() != null) {
            // 엔티티 equals/hashCode 가 아이디 기준이면 contains 동작 OK
            this.favoritedByMe = me.getFavorite().contains(r);
        } else {
            this.favoritedByMe = false;
        }

        // 재료 rows
        this.ingredientRows = (r.getIngredientRows() == null || !Hibernate.isInitialized(r.getIngredientRows()))
            ? List.of()
            : r.getIngredientRows().stream()
            .map(IngredientRowDTO::new)
            .collect(Collectors.toList());

        // 스텝 이미지
        this.stepImages = (r.getStepImages() == null || !Hibernate.isInitialized(r.getStepImages()))
                ? List.of()
                : r.getStepImages().stream()
                .sorted((s1, s2) -> {
                    Integer aIdx = s1.getStepIndex();
                    Integer bIdx = s2.getStepIndex();
                    if (aIdx == null && bIdx == null) return 0;
                    if (aIdx == null) return 1;
                    if (bIdx == null) return -1;
                    return Integer.compare(aIdx, bIdx);
                })
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
            this.stepOrder = s.getStepIndex();
            this.description = s.getCaption();
            if (s.getImage() != null && s.getImage().length > 0) {
                this.imageUrl = "/recipe/steps/" + s.getId() + "/image";
            }
        }
    }
}