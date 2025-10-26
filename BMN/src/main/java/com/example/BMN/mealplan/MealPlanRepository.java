// src/main/java/com/example/BMN/mealplan/MealPlanRepository.java
package com.example.BMN.mealplan;

import com.example.BMN.User.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    Optional<MealPlan> findByUserAndPlanDateAndTitleAndRecipe_Id(
            SiteUser user, LocalDate planDate, String title, Long recipeId
    );

    List<MealPlan> findByUserAndPlanDateOrderByTitleAscPositionAscIdAsc(
            SiteUser user, LocalDate planDate
    );

    List<MealPlan> findByUserAndPlanDateBetweenOrderByPlanDateAscTitleAscPositionAscIdAsc(
            SiteUser user, LocalDate start, LocalDate end
    );

    @Query("""
        select coalesce(max(m.position), 0)
        from MealPlan m
        where m.user = :user and m.planDate = :planDate and m.title = :title
    """)
    Integer findMaxPosition(@Param("user") SiteUser user,
                            @Param("planDate") LocalDate planDate,
                            @Param("title") String title);
}