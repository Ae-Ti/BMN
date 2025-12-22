package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    boolean existsByUserAndRecipe(SiteUser user, Recipe recipe);

    int countByRecipe(Recipe recipe);

    void deleteByUserAndRecipe(SiteUser user, Recipe recipe);

    Page<Favorite> findByUser(SiteUser user, Pageable pageable);

    @Query("select f from Favorite f join fetch f.recipe r left join fetch r.author where f.user = :user order by f.id desc")
    List<Favorite> findWithRecipeByUserOrderByIdDesc(@Param("user") SiteUser user);

    // ✅ 레시피 ID 목록에 대한 즐겨찾기 개수를 일괄 조회
    @Query("select f.recipe.id, count(f) from Favorite f where f.recipe.id in :ids group by f.recipe.id")
    List<Object[]> countByRecipeIdsRaw(@Param("ids") List<Long> ids);

    // ✅ 위 결과를 Map<Long, Long> 으로 변환하는 default 메서드
    default Map<Long, Long> countByRecipeIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return Map.of();
        List<Object[]> rows = countByRecipeIdsRaw(ids);
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            Long recipeId = (Long) row[0];
            Long count = (Long) row[1];
            result.put(recipeId, count);
        }
        return result;
    }
}