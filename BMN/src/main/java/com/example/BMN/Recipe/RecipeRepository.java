package com.example.BMN.Recipe;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Integer> {
    Recipe findBySubject(String subject);
    Recipe findBySubjectAndContent(String subject, String content);
    List<Recipe> findBySubjectLike(String subject);
    Page<Recipe> findAll(Pageable pageable);
}
