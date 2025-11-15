// src/main/java/com/example/BMN/mypage/ProfileController.java
package com.example.BMN.mypage;

import com.example.BMN.Recipe.Favorite;
import com.example.BMN.Recipe.FavoriteRepository;
import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeDTO;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.User.PublicUserDTO;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import com.example.BMN.User.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/user/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final RecipeRepository recipeRepository;
    private final FavoriteRepository favoriteRepository;

    /* ======================= 내부 유틸 ======================= */

    private String currentUsernameOrNull() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        return auth.getName();
    }

    private SiteUser currentUser() {
        String username = currentUsernameOrNull();
        if (username == null)
            throw new AccessDeniedException("Unauthenticated");
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    private SiteUser findByUsername(String username) {
        return userRepository.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
    }

    /* ======================= 내 프로필 ======================= */

    /** ✅ 내 프로필 기본 정보 */
    @GetMapping("/me")
    public ResponseEntity<PublicUserDTO> myProfile() {
        try {
            SiteUser me = currentUser();
            PublicUserDTO dto = PublicUserDTO.fromEntity(me);
            dto.setFollowingCount(userService.countFollowing(me.getUserName()));
            dto.setFollowerCount(userService.countFollowers(me.getUserName()));
            dto.setFollowedByMe(false); // 본인은 자기 자신을 팔로우하지 않음
            return ResponseEntity.ok(dto);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /** ✅ 내가 작성한 레시피 목록 */
    @GetMapping("/me/recipes")
    public ResponseEntity<List<MyRecipeDto>> myRecipes() {
        try {
            SiteUser me = currentUser();
            List<MyRecipeDto> list = recipeRepository.findAllByAuthorOrderByIdDesc(me)
                    .stream()
                    .map(MyRecipeDto::of)
                    .toList();
            return ResponseEntity.ok(list);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /** ✅ 내가 즐겨찾기한 레시피 목록 */
    @GetMapping("/me/favorites")
    public ResponseEntity<List<RecipeDTO>> myFavorites() {
        try {
            SiteUser me = currentUser();
            List<RecipeDTO> list = favoriteRepository.findByUserOrderByIdDesc(me)
                    .stream()
                    .map(Favorite::getRecipe)
                    .map(RecipeDTO::new)
                    .toList();
            return ResponseEntity.ok(list);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /* ======================= 타 사용자 프로필 ======================= */

    /** ✅ 타 사용자 기본 정보 + 팔로잉/팔로워 수 + 내가 팔로우 중인지 여부 */
    @GetMapping("/{username}")
    public ResponseEntity<PublicUserDTO> userProfile(@PathVariable String username) {
        SiteUser target = findByUsername(username);
        String me = currentUsernameOrNull();

        PublicUserDTO dto = PublicUserDTO.fromEntity(target);
        dto.setFollowingCount(userService.countFollowing(username));
        dto.setFollowerCount(userService.countFollowers(username));
        dto.setFollowedByMe(userService.isFollowing(username));

        return ResponseEntity.ok(dto);
    }

    /* ======================= 팔로우/언팔로우 ======================= */

    /** ✅ 팔로우 */
    @PostMapping("/{username}/follow")
    public ResponseEntity<Void> follow(@PathVariable String username) {
        try {
            userService.follow(username);
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /** ✅ 언팔로우 */
    @DeleteMapping("/{username}/follow")
    public ResponseEntity<Void> unfollow(@PathVariable String username) {
        try {
            userService.unfollow(username);
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /* ======================= 팔로잉/팔로워 목록 ======================= */

    /** ✅ 팔로잉 목록 */
    @GetMapping("/{username}/following")
    public ResponseEntity<PageEnvelope<PublicUserDTO>> following(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<PublicUserDTO> p = userService.findFollowing(username, PageRequest.of(page, size));
        return ResponseEntity.ok(PageEnvelope.of(p));
    }

    /** ✅ 팔로워 목록 */
    @GetMapping("/{username}/followers")
    public ResponseEntity<PageEnvelope<PublicUserDTO>> followers(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<PublicUserDTO> p = userService.findFollowers(username, PageRequest.of(page, size));
        return ResponseEntity.ok(PageEnvelope.of(p));
    }

    /* ======================= 타 사용자의 레시피/즐겨찾기 ======================= */

    /** ✅ 타 사용자가 작성한 레시피 목록 */
    @GetMapping("/{username}/recipes")
    public ResponseEntity<List<RecipeDTO>> userRecipes(@PathVariable String username) {
        SiteUser target = findByUsername(username);
        List<RecipeDTO> list = recipeRepository.findAllByAuthorOrderByIdDesc(target)
                .stream()
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok(list);
    }

    /** ✅ 타 사용자가 즐겨찾기한 레시피 목록 */
    @GetMapping("/{username}/favorites")
    public ResponseEntity<List<RecipeDTO>> userFavorites(@PathVariable String username) {
        SiteUser target = findByUsername(username);
        List<RecipeDTO> list = favoriteRepository.findByUserOrderByIdDesc(target)
                .stream()
                .map(Favorite::getRecipe)
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok(list);
    }

    /* ======================= 내부 DTO 및 유틸 ======================= */

    record MyRecipeDto(Long id, String subject, String createdAt) {
        static MyRecipeDto of(Recipe r) {
            var created = r.getCreateDate() == null ? null :
                    r.getCreateDate().atZone(ZoneId.systemDefault()).toInstant().toString();
            return new MyRecipeDto(r.getId(), r.getSubject(), created);
        }
    }

    public record PageEnvelope<T>(List<T> content, int page, int size, long total, boolean last) {
        static <T> PageEnvelope<T> of(Page<T> p) {
            return new PageEnvelope<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.isLast());
        }
    }

    private String usernameOf(String s) {
        return (s == null || s.isBlank()) ? "" : s;
    }

    /* ======================= 프로필 보완 ======================= */

    // Simple request body for profile completion. Jackson will bind fields by name.
    public static class ProfileCompleteRequest {
        public String nickname;
        public Long age;
        public String sex;
        public String introduction;

        public ProfileCompleteRequest() {}
    }

    /** 첫 OAuth 로그인 등에서 부족한 정보를 저장하고 profileComplete 플래그를 설정합니다. */
    @PostMapping("/complete")
    public ResponseEntity<Void> completeProfile(@RequestBody ProfileCompleteRequest req) {
        try {
            SiteUser me = currentUser();

            // nickname 중복 체크 (다른 사용자의 닉네임과 겹치는 경우 400)
            if (req.nickname != null && !req.nickname.isBlank()) {
                String newNick = req.nickname.trim();
                // allow if same as current nickname
                if (!newNick.equals(me.getNickname()) && userRepository.existsByNickname(newNick)) {
                    return ResponseEntity.badRequest().build();
                }
                me.setNickname(newNick);
            }

            if (req.age != null) me.setAge(req.age);
            if (req.sex != null) me.setSex(req.sex);
            if (req.introduction != null) me.setIntroduction(req.introduction);

            me.setProfileComplete(true);
            userRepository.save(me);
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }
}