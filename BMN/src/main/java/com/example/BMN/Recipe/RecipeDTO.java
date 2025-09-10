package com.example.BMN.Recipe;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeStepImage;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class RecipeDTO {
    private Long id;
    private String subject;
    private String ingredients;
    private Integer cookingTimeMinutes;
    private String description;
    private String tools;
    private Integer estimatedPrice;
    private String content;
    private LocalDateTime createDate;
    private Long authorId;
    private String thumbnailBase64;

    private String thumbnailUrl;

    private String imageUrl;
    private List<StepImageDTO> stepImages;

    public RecipeDTO(Recipe r) {
        this.id = r.getId();
        this.subject = r.getSubject();
        this.ingredients = r.getIngredients();
        this.cookingTimeMinutes = r.getCookingTimeMinutes();
        this.description = r.getDescription();
        this.tools = r.getTools();
        this.estimatedPrice = r.getEstimatedPrice();
        this.content = r.getContent();
        this.createDate = r.getCreateDate();
        this.authorId = (r.getAuthor()!=null? r.getAuthor().getId(): null);
        this.thumbnailBase64 = (r.getThumbnail()!=null && r.getThumbnail().length>0)
                ? Base64.getEncoder().encodeToString(r.getThumbnail())
                : null;
        // [추가] 썸네일 URL 생성
        this.thumbnailUrl = "/recipe/thumbnail/" + r.getId();

        this.stepImages = r.getStepImages()==null? List.of()
                : r.getStepImages().stream().map(StepImageDTO::new).toList();
    }

    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StepImageDTO {
        private Integer stepOrder;
        private String description;
        private String imageBase64;
        private String imageUrl;

        public StepImageDTO(RecipeStepImage s) {
            this.stepOrder = s.getStepIndex();
            this.description = s.getCaption();
            this.imageBase64 = (s.getImage()!=null && s.getImage().length>0)
                    ? Base64.getEncoder().encodeToString(s.getImage())
                    : null;

            this.imageUrl = "/recipe/steps/" + s.getId() + "/image";

        }
    }
}
