package com.example.BMN.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<SiteUser, Long> {

    /* ====== 기본 조회 ====== */
    Optional<SiteUser> findByUserName(String userName);
    Optional<SiteUser> findByEmail(String email);
    Optional<SiteUser> findByProviderAndProviderId(String provider, String providerId);
    boolean existsByUserName(String userName);
    boolean existsByEmail(String email);

    /* ====== 즐겨찾기(레시피) 관련 ====== */
    @Query("select count(u) from SiteUser u join u.favorite f where f.id = :recipeId")
    int countFavoritesByRecipeId(@Param("recipeId") Long recipeId);

    /* ====== 팔로우/팔로워 카운트 ====== */
    // 내가 팔로우하는 사람 수 (팔로잉)
    @Query("select count(f) from SiteUser u join u.follow f where u.id = :userId")
    long countFollowing(@Param("userId") Long userId);

    // 나를 팔로우하는 사람 수 (팔로워)
    @Query("select count(f) from SiteUser u join u.follower f where u.id = :userId")
    long countFollowers(@Param("userId") Long userId);

    /* ====== 팔로잉/팔로워 목록 (페이징) ====== */
    // 팔로잉 목록: username 사용자가 팔로우하는 대상들
    @Query("select f from SiteUser u join u.follow f where u.userName = :userName")
    Page<SiteUser> findFollowing(@Param("userName") String userName, Pageable pageable);

    // 팔로워 목록: username 사용자를 팔로우하는 사람들
    @Query("select f from SiteUser u join u.follower f where u.userName = :userName")
    Page<SiteUser> findFollowers(@Param("userName") String userName, Pageable pageable);

    /* ====== 팔로잉 여부 확인 ====== */
    @Query("select (count(f) > 0) from SiteUser u join u.follow f where u.id = :meId and f.id = :targetId")
    boolean existsFollowing(@Param("meId") Long meId, @Param("targetId") Long targetId);
}