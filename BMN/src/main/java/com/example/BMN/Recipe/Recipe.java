package com.example.BMN.Recipe;

import com.example.BMN.Review.Review;
import com.example.BMN.User.SiteUser;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Table(name="recipe")
@Entity
@Getter
@Setter
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String subject; //요리이름

    @Lob
    private byte[] thumbnail;//대표사진(1장)

    private String ingredients;//들어가는 재료

    private Integer cookingTimeMinutes;//소요시간(분 단위)

    @Lob
    private String description;//조리 설명

    //+++구매링크추가할 엔티티 추가

    private String tools;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepIndex ASC")
    private List<RecipeStepImage> stepImages = new ArrayList<>();

    public void addStepImage(RecipeStepImage step) {
        step.setRecipe(this);      // FK 세팅 (핵심)
        this.stepImages.add(step);
    }
    public void removeStepImage(RecipeStepImage step) {
        step.setRecipe(null);
        this.stepImages.remove(step);
    }

    private Integer estimatedPrice;//총예상가격

    @Column(columnDefinition = "TEXT")
    private String content;//추가설명

    private LocalDateTime createDate;//게시글 작성 날짜

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.REMOVE)
    private List<Review> reviewList;

    @ManyToOne
    private SiteUser author;
}
