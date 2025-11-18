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
import com.example.BMN.User.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import java.util.List;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/user/profile")
@RequiredArgsConstructor
public class ProfileController {

    private static final Logger log = LoggerFactory.getLogger(ProfileController.class);

    private final UserRepository userRepository;
    private final UserService userService;
    private final RecipeRepository recipeRepository;
    private final FavoriteRepository favoriteRepository;
    private final JwtUtil jwtUtil;

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
            dto.setEmailVerified(me.getEmailVerified());
            dto.setFollowingCount(userService.countFollowing(me.getUserName()));
            dto.setFollowerCount(userService.countFollowers(me.getUserName()));
            dto.setFollowedByMe(false); // 본인은 자기 자신을 팔로우하지 않음
            return ResponseEntity.ok(dto);
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /** ✅ 내가 작성한 레시피 목록 (클라이언트가 카드에 필요한 모든 필드를 사용하도록 RecipeDTO로 반환) */
    @GetMapping("/me/recipes")
    public ResponseEntity<List<RecipeDTO>> myRecipes() {
        try {
            SiteUser me = currentUser();
            List<RecipeDTO> list = recipeRepository.findAllByAuthorOrderByIdDesc(me)
                    .stream()
                    .map(RecipeDTO::new)
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
        dto.setEmailVerified(target.getEmailVerified());
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
        public String username;
        public String nickname;
        public Integer birthYear;
        public Integer birthMonth;
        public Integer birthDay;
        public String sex;
        public String introduction;

        public ProfileCompleteRequest() {}
    }

    /** 첫 OAuth 로그인 등에서 부족한 정보를 저장하고 profileComplete 플래그를 설정합니다. */
    @PostMapping("/complete")
    public ResponseEntity<?> completeProfile(@RequestBody ProfileCompleteRequest req, HttpServletRequest request) {
        try {
            log.info("Profile completion requested: nickname='{}', birth={}{}{}", req.nickname, req.birthYear, req.birthMonth, req.birthDay);
            SiteUser me = null;
            try {
                me = currentUser();
                log.debug("Authenticated user from SecurityContext: {}", me.getUserName());
            } catch (AccessDeniedException ade) {
                // Not authenticated via SecurityContext — try to extract username from token (cookie or Authorization header)
                String token = null;
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                    log.debug("Found Authorization header token");
                }
                if (token == null && request.getCookies() != null) {
                    for (Cookie c : request.getCookies()) {
                        if ("AUTH_TOKEN".equals(c.getName())) {
                            token = c.getValue();
                            log.debug("Found AUTH_TOKEN cookie token");
                            break;
                        }
                    }
                }

                if (token == null) {
                    log.warn("No token found in Authorization header or AUTH_TOKEN cookie during profile completion");
                    return ResponseEntity.status(401).build();
                }

                try {
                    if (!jwtUtil.validateToken(token)) {
                        log.warn("JWT validation failed during profile completion");
                        return ResponseEntity.status(401).build();
                    }
                    String username = jwtUtil.extractUsername(token);
                    if (username == null) {
                        log.warn("JWT contained no username (sub)");
                        return ResponseEntity.status(401).build();
                    }
                    log.info("Profile completion token corresponds to username='{}'", username);

                    // First try to find by userName
                    var maybe = userRepository.findByUserName(username);
                    if (maybe.isPresent()) {
                        me = maybe.get();
                        log.debug("Found existing user record id={} for username='{}'", me.getId(), username);
                    } else {
                        // If not found by userName, try by email (some records may store email but different userName)
                        var byEmail = userRepository.findByEmail(username);
                        if (byEmail.isPresent()) {
                            me = byEmail.get();
                            log.debug("Found existing user record id={} by email='{}'", me.getId(), username);
                        } else {
                            // No existing user found. Perform validations BEFORE creating a new record.
                            // 1) If the client requested a username, ensure it's available.
                            if (req.username != null && !req.username.isBlank()) {
                                String desired = req.username.trim();
                                if (userRepository.existsByUserName(desired)) {
                                    log.warn("Requested username '{}' already exists; aborting profile completion", desired);
                                    return ResponseEntity.badRequest().body(java.util.Map.of("message", "이미 사용 중인 아이디입니다."));
                                }
                            }

                            // 2) Defensive: if the email itself is already used in the email column by another account, refuse to create
                            if (userRepository.existsByEmail(username)) {
                                log.warn("Email '{}' already exists in database; aborting profile completion to avoid duplicate accounts", username);
                                return ResponseEntity.status(409).body(java.util.Map.of("message", "이미 등록된 이메일입니다. 기존 계정으로 로그인하세요."));
                            }

                            // All validations passed — create minimal user record now using requested username if provided.
                            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                            SiteUser created = new SiteUser();
                            String initialUserName = (req.username != null && !req.username.isBlank()) ? req.username.trim() : username;
                            created.setUserName(initialUserName);
                            created.setEmail(username);
                            created.setPassword(encoder.encode(UUID.randomUUID().toString()));
                            created.setIntroduction("구글 계정으로 생성된 사용자");
                            // nickname will be set from req below if provided
                            created.setProfileComplete(false);
                            me = userRepository.save(created);
                            log.info("Created minimal SiteUser id={} for username='{}' (email='{}')", me.getId(), me.getUserName(), username);
                        }
                    }
                } catch (Exception ex) {
                    log.error("Error while extracting username or creating user during profile completion: {}", ex.getMessage(), ex);
                    // token invalid or DB error
                    return ResponseEntity.status(401).build();
                }
            }

            // Allow user to set a username (userName) during profile completion.
            if (req.username != null && !req.username.isBlank()) {
                String newUserName = req.username.trim();
                // if the user is changing username, ensure it's not already taken
                if (!newUserName.equals(me.getUserName())) {
                    if (userRepository.existsByUserName(newUserName)) {
                        log.warn("Requested username '{}' already exists", newUserName);
                        return ResponseEntity.badRequest().body(java.util.Map.of("message", "이미 사용 중인 아이디입니다."));
                    }
                    log.info("Setting userName for user id={} : {} -> {}", me.getId(), me.getUserName(), newUserName);
                    me.setUserName(newUserName);
                }
            }

            // 닉네임 중복 검사를 제거했습니다. 클라이언트에서 같은 닉네임을 여러 사용자가 가질 수 있습니다.
            if (req.nickname != null && !req.nickname.isBlank()) {
                String newNick = req.nickname.trim();
                me.setNickname(newNick);
            }

            if (req.birthYear != null && req.birthMonth != null && req.birthDay != null) {
                try {
                    me.setDateOfBirth(java.time.LocalDate.of(req.birthYear, req.birthMonth, req.birthDay));
                } catch (Exception ex) {
                    // ignore invalid date
                }
            }
            if (req.sex != null) me.setSex(req.sex);
            if (req.introduction != null) me.setIntroduction(req.introduction);

        me.setProfileComplete(true);
            SiteUser saved = userRepository.save(me);
            log.info("Profile completed for user id={} userName={}", saved.getId(), saved.getUserName());

            // Update SecurityContext principal for the current request so subsequent calls that
            // rely on Authentication.getName() will see the new username immediately.
            try {
                Authentication current = SecurityContextHolder.getContext().getAuthentication();
                if (current != null) {
                    Authentication updated = new UsernamePasswordAuthenticationToken(
                            saved.getUserName(),
                            null,
                            current.getAuthorities() == null || current.getAuthorities().isEmpty()
                                    ? Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                                    : current.getAuthorities()
                    );
                    SecurityContextHolder.getContext().setAuthentication(updated);
                }
            } catch (Exception e) {
                log.warn("Failed to update SecurityContext after username change: {}", e.getMessage());
            }

        String newToken = jwtUtil.generateToken(saved.getUserName());
        return ResponseEntity.ok(java.util.Map.of(
            "message", "프로필이 저장되었습니다.",
            "userName", saved.getUserName(),
            "token", newToken
        ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    // Link endpoint removed: linking flows have been simplified. OAuth logins will now
    // directly authenticate existing accounts (by email/userName) or create a minimal
    // persistent user record during the OAuth success handler.
}