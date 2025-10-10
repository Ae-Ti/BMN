package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import com.example.BMN.comment.Comment;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Table(name = "recipe")
@Entity
@Getter
@Setter
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String subject; // 요리 이름

    @Lob
    private byte[] thumbnail; // 대표사진(1장)

    private Integer cookingTimeMinutes; // 소요시간(분 단위)

    @Lob
    private String description; // 조리 설명

    private String tools; // 조리 도구

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepIndex ASC")
    private List<RecipeStepImage> stepImages = new ArrayList<>();

    public void addStepImage(RecipeStepImage step) {
        step.setRecipe(this);
        this.stepImages.add(step);
    }
    public void removeStepImage(RecipeStepImage step) {
        step.setRecipe(null);
        this.stepImages.remove(step);
    }

    private Integer estimatedPrice; // 총 예상 가격

    private LocalDateTime createDate; // 작성 날짜

    // ✅ 댓글 (레시피 삭제 시 자동 삭제)
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<Comment> commentList = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    private SiteUser author;

    // ✅ 정규화된 재료 행(Row)
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<RecipeIngredient> ingredientRows = new ArrayList<>();

    public void addIngredientRow(RecipeIngredient ri) {
        ri.setRecipe(this);
        this.ingredientRows.add(ri);
    }

    // ⭐ 평균 별점/개수 (DB 컬럼명 명시)
    @Column(name = "average_rating", nullable = false)
    private Double averageRating = 0.0;

    @Column(name = "rating_count", nullable = false)
    private Integer ratingCount = 0;

    // ⭐ 조회수/즐겨찾기 수 (추가된 최소 필드)
    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "favorite_count", nullable = false)
    private Integer favoriteCount = 0;

    @PrePersist
    protected void onCreate() {
        if (createDate == null) createDate = LocalDateTime.now();
        if (averageRating == null) averageRating = 0.0;
        if (ratingCount == null) ratingCount = 0;
        if (viewCount == null) viewCount = 0L;
        if (favoriteCount == null) favoriteCount = 0;
    }
}