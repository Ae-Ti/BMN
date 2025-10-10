package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserAndRecipe(SiteUser user, Recipe recipe);

    int countByRecipe(Recipe recipe);

    void deleteByUserAndRecipe(SiteUser user, Recipe recipe);
    Page<Favorite> findByUser(SiteUser user, Pageable pageable);
}