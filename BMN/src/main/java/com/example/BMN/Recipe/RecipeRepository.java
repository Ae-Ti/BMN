// src/main/java/com/example/BMN/Recipe/RecipeRepository.java
package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    /* ------------------ 기본 검색 ------------------ */
    Recipe findBySubject(String subject);
    List<Recipe> findBySubjectLike(String subject);
    Recipe findBySubjectAndDescription(String subject, String description);

    Page<Recipe> findAll(Pageable pageable);
    List<Recipe> findAllByAuthorOrderByIdDesc(SiteUser author);
    List<Recipe> findByIdIn(List<Long> ids);

    /* ------------------ 정렬용 조회 ------------------ */
    Page<Recipe> findAllByOrderByCreateDateDesc(Pageable pageable);                  // 최신순
    Page<Recipe> findAllByOrderByViewCountDesc(Pageable pageable);                   // 조회수순
    Page<Recipe> findAllByOrderByFavoriteCountDesc(Pageable pageable);               // 즐겨찾기순
    Page<Recipe> findAllByOrderByAverageRatingDescRatingCountDesc(Pageable pageable);// 평점순(평점→참여수)
    Page<Recipe> findByAuthor(SiteUser author, Pageable pageable);

    /* ------------------ 원자적 증감 쿼리 ------------------ */

    /** 즐겨찾기 수 +1 */
    @Modifying
    @Query("UPDATE Recipe r SET r.favoriteCount = r.favoriteCount + 1 WHERE r.id = :id")
    void increaseFavoriteCount(@Param("id") Long id);

    /** 즐겨찾기 수 -1 (0 미만 방지) */
    @Modifying
    @Query("""
        UPDATE Recipe r
        SET r.favoriteCount = CASE
            WHEN r.favoriteCount > 0 THEN r.favoriteCount - 1
            ELSE 0
        END
        WHERE r.id = :id
        """)
    void decreaseFavoriteCount(@Param("id") Long id);
}