package com.example.BMN.Recipe;

import com.example.BMN.Review.Review;
import com.example.BMN.User.SiteUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Table(name="recipe")
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

    @Column(columnDefinition = "TEXT")
    private String content; // 추가 설명

    private LocalDateTime createDate; // 작성 날짜

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.REMOVE)
    private List<Review> reviewList = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    private SiteUser author;

    // ✅ 새로 추가: 정규화된 재료 행(Row)들
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<RecipeIngredient> ingredientRows = new ArrayList<>();

    public void addIngredientRow(RecipeIngredient ri) {
        ri.setRecipe(this);
        this.ingredientRows.add(ri);
    }
}