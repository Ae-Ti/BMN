package com.example.BMN.Recipe;

import com.example.BMN.Review.Review;
import com.example.BMN.User.SiteUser;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
@Setter
public class RecipeDTO {
    private Long id;
    private String subject;
    private String content;
    private LocalDateTime createDate;
    private List<Review> reviewList;
    private Long authorId;

    public RecipeDTO(Recipe recipe) {
        this.id = recipe.getId();
        this.subject = recipe.getSubject();
        this.content = recipe.getContent();
        this.createDate = recipe.getCreateDate();
        this.reviewList = recipe.getReviewList();
        this.authorId = recipe.getAuthor().getId();
    }

}
