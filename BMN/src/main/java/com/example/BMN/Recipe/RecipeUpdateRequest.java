package com.example.BMN.Recipe;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecipeUpdateRequest {

    private String title;

    @Size(max = 10000)
    private String description;

    private String tools;

    private Integer estimatedPrice;

    @Size(max = 10000)
    private String content;

    // ✅ 추가: 소요 시간(분)
    private Integer cookingTimeMinutes;

    // ✅ 추가: 재료 (리스트 기반 업데이트도 가능)
    private java.util.List<RecipeIngredientDTO> ingredients;
}