package com.example.BMN.Recipe;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RecipeIngredientDTO {
    private Long id;
    private String name;      // 원본 이름
    private String link;      // 구매링크(있으면)
    private String nameNorm;  // 정규화된 이름
    private Integer position; // 순서

    public RecipeIngredientDTO(RecipeIngredient ri) {
        this.id = ri.getId();
        this.name = ri.getName();
        this.link = ri.getLink();
        this.nameNorm = ri.getNameNorm();
        this.position = ri.getPosition();
    }
}