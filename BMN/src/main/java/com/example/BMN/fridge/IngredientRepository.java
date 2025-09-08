// src/main/java/com/example/BMN/fridge/IngredientRepository.java
package com.example.BMN.fridge;

import com.example.BMN.User.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {
    List<Ingredient> findAllByOwnerOrderByIdDesc(SiteUser owner);
    List<Ingredient> findAllByOwnerAndCategoryOrderByIdDesc(SiteUser owner, IngredientCategory category);
    Optional<Ingredient> findByIdAndOwner(Long id, SiteUser owner);
    long deleteByIdAndOwner(Long id, SiteUser owner);
}