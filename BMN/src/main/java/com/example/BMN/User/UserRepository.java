package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<SiteUser, Long> {
    Optional<SiteUser> findByUserName(String userName);
    boolean existsByUserName(String userName);
    @Query("select count(u) from SiteUser u join u.favorite f where f.id = :recipeId")
    int countFavoritesByRecipeId(@Param("recipeId") Long recipeId);

}