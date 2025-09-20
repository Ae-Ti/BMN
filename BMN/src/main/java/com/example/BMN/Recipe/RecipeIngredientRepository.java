// src/main/java/com/example/BMN/Recipe/RecipeIngredientRepository.java
package com.example.BMN.Recipe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipeIdOrderByPositionAsc(Long recipeId);
    long deleteByRecipeId(Long recipeId);
}