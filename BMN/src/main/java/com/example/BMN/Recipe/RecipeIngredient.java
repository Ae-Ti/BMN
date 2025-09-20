// src/main/java/com/example/BMN/Recipe/RecipeIngredient.java
package com.example.BMN.Recipe;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recipe_ingredient",
        indexes = {
                @Index(name = "idx_recipe_ing_recipe_id", columnList = "recipe_id"),
                @Index(name = "idx_recipe_ing_namenorm", columnList = "nameNorm")
        })
@Getter @Setter
public class RecipeIngredient {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    @Column(nullable = false, length = 200)
    private String name;       // 원본 입력명 (예: "양파 1/2개")

    @Column(length = 1000)
    private String link;       // 구매 링크(선택)

    @Column(nullable = false, length = 200)
    private String nameNorm;   // 정규화명 (예: "양파")

    private Integer position;  // 입력 순서(정렬용)
}