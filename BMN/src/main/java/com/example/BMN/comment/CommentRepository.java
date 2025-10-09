package com.example.BMN.comment;

import com.example.BMN.Recipe.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByRecipeIdOrderByCreatedAtAsc(Long recipeId);
    List<Comment> findByRecipe(Recipe recipe);
}