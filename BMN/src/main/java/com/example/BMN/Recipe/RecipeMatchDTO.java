package com.example.BMN.Recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;            // ✅ 추가
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder                       // ✅ 추가
public class RecipeMatchDTO {
    private Long id;
    private String subject;
    private Integer cookingTimeMinutes;
    private Integer estimatedPrice;
    private String thumbnailUrl;

    private int totalIngredients;
    private int matchedIngredients;
    private int matchPercent;

    private Integer soonestExpiryDays;

    private List<String> matchedNames;
    private List<String> missingNames;
}