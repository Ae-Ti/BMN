package com.example.BMN.Recipe;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.BMN.User.SiteUser;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    Recipe findBySubject(String subject);
    List<Recipe> findBySubjectLike(String subject);
    Recipe findBySubjectAndDescription(String subject, String description);
    Page<Recipe> findAll(Pageable pageable);

    List<Recipe> findAllByAuthorOrderByIdDesc(SiteUser author);

    List<Recipe> findByIdIn(List<Long> ids);
}
