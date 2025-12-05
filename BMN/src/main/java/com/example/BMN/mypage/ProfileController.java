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
import com.example.BMN.User.EmailService;
import com.example.BMN.User.PendingEmailChange;
import com.example.BMN.User.PendingEmailChangeRepository;
import com.example.BMN.User.PendingRegistrationRepository;
import com.example.BMN.comment.CommentRepository;
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
import java.time.LocalDateTime;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

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
    private final CommentRepository commentRepository;
    private final PendingEmailChangeRepository pendingEmailChangeRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final EmailService emailService;
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

    /** 성별을 영문(male/female)으로 정규화 */
    private String normalizeSex(String sex) {
        if (sex == null || sex.isBlank()) return null;
        String s = sex.trim().toLowerCase();
        if (s.equals("남") || s.equals("남성") || s.equals("male") || s.equals("m")) {
            return "male";
        } else if (s.equals("여") || s.equals("여성") || s.equals("female") || s.equals("f")) {
            return "female";
        } else if (s.equals("other") || s.equals("기타")) {
            return "other";
        }
        return sex; // 알 수 없는 값은 그대로 저장
    }

    /* ======================= 내 프로필 ======================= */

    /** ✅ 내 프로필 기본 정보 */
    @GetMapping("/me")
    public ResponseEntity<?> myProfile() {
        String username = currentUsernameOrNull();
        if (username == null) {
            // No authentication at all
            return ResponseEntity.status(401).body(java.util.Map.of(
                "status", 401,
                "code", "UNAUTHENTICATED",
                "message", "인증이 필요합니다."
            ));
        }
        
        var userOpt = userRepository.findByUserName(username);
        if (userOpt.isEmpty()) {
            // Token is valid but user not in DB (OAuth user who hasn't completed profile)
            return ResponseEntity.status(401).body(java.util.Map.of(
                "status", 401,
                "code", "USER_NOT_FOUND",
                "message", "프로필 완성이 필요합니다."
            ));
        }
        
        SiteUser me = userOpt.get();
        PublicUserDTO dto = PublicUserDTO.fromEntity(me);
        dto.setEmailVerified(me.getEmailVerified());
        dto.setFollowingCount(userService.countFollowing(me.getUserName()));
        dto.setFollowerCount(userService.countFollowers(me.getUserName()));
        dto.setFollowedByMe(false); // 본인은 자기 자신을 팔로우하지 않음
        return ResponseEntity.ok(dto);
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

    /* ======================= 프로필 수정 ======================= */

    public static class ProfileUpdateRequest {
        public String nickname;
        public String introduction;
        public Boolean emailPublic;
    }

    /** ✅ 내 프로필 수정 (닉네임, 소개글, 이메일 공개 여부) */
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody ProfileUpdateRequest req) {
        try {
            SiteUser me = currentUser();

            if (req.nickname != null) {
                me.setNickname(req.nickname.trim());
            }
            if (req.introduction != null) {
                me.setIntroduction(req.introduction.trim());
            }
            if (req.emailPublic != null) {
                me.setEmailPublic(req.emailPublic);
            }

            SiteUser saved = userRepository.save(me);
            log.info("Profile updated for user id={} userName={}", saved.getId(), saved.getUserName());

            return ResponseEntity.ok(java.util.Map.of(
                "message", "프로필이 수정되었습니다.",
                "nickname", saved.getNickname() != null ? saved.getNickname() : "",
                "introduction", saved.getIntroduction() != null ? saved.getIntroduction() : "",
                "emailPublic", saved.getEmailPublic() != null ? saved.getEmailPublic() : false
            ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        }
    }

    /* ======================= 회원 탈퇴 ======================= */

    /** ✅ 회원 탈퇴 - 레시피는 유지(작성자 null), 댓글은 삭제 */
    @DeleteMapping("/me")
    @Transactional
    public ResponseEntity<?> deleteMyAccount() {
        try {
            SiteUser me = currentUser();
            Long userId = me.getId();
            String userName = me.getUserName();

            // 1. 작성한 레시피의 author를 null로 설정 (레시피 보존, "탈퇴한 사용자"로 표시됨)
            recipeRepository.clearAuthor(me);
            log.info("Cleared author for recipes of user id={}", userId);

            // 2. 작성한 댓글 삭제
            commentRepository.deleteByAuthor(me);
            log.info("Deleted comments by user id={}", userId);

            // 3. 즐겨찾기 관계 정리
            me.getFavorite().clear();
            me.getLike().clear();

            // 4. 팔로우/팔로워 관계 정리
            me.getFollow().clear();
            me.getFollower().clear();
            userRepository.save(me);

            // 5. 유저 삭제
            userRepository.delete(me);

            log.info("User deleted: id={} userName={}", userId, userName);

            return ResponseEntity.ok(java.util.Map.of(
                "message", "회원 탈퇴가 완료되었습니다."
            ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            log.error("Failed to delete user: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(java.util.Map.of(
                "message", "회원 탈퇴 처리 중 오류가 발생했습니다."
            ));
        }
    }

    /* ======================= 이메일 변경 ======================= */

    public static class EmailChangeRequest {
        public String newEmail;
    }

    /** ✅ 이메일 변경 요청 - 새 이메일로 인증 메일 발송 */
    @PostMapping("/me/email-change")
    @Transactional
    public ResponseEntity<?> requestEmailChange(@RequestBody EmailChangeRequest req, HttpServletRequest request) {
        try {
            SiteUser me = currentUser();
            String newEmail = req.newEmail != null ? req.newEmail.trim().toLowerCase() : null;

            if (newEmail == null || newEmail.isBlank()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "새 이메일 주소를 입력해주세요."));
            }

            // 이메일 형식 검증
            if (!newEmail.matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "올바른 이메일 형식이 아닙니다."));
            }

            // 현재 이메일과 동일한지 확인
            if (newEmail.equalsIgnoreCase(me.getEmail())) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "현재 사용 중인 이메일과 동일합니다."));
            }

            // 이미 다른 사용자가 사용 중인 이메일인지 확인
            if (userRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "이미 사용 중인 이메일입니다."));
            }

            // 회원가입 대기 중인 이메일인지 확인
            if (pendingRegistrationRepository.existsByEmail(newEmail)) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "이미 사용 중인 이메일입니다."));
            }

            // 이미 이메일 변경 요청이 있으면 삭제
            pendingEmailChangeRepository.deleteByUserId(me.getId());

            // 새 이메일 변경 요청 생성
            String token = UUID.randomUUID().toString();
            PendingEmailChange pending = new PendingEmailChange();
            pending.setUserId(me.getId());
            pending.setNewEmail(newEmail);
            pending.setToken(token);
            pending.setCreatedAt(LocalDateTime.now());
            pending.setExpiresAt(LocalDateTime.now().plusHours(24));
            pendingEmailChangeRepository.save(pending);

            // 새 이메일로 인증 메일 발송
            String displayName = me.getNickname() != null ? me.getNickname() : me.getUserName();
            emailService.sendEmailChangeVerification(newEmail, displayName, token, request);

            log.info("Email change requested for user id={}, newEmail={}", me.getId(), newEmail);

            return ResponseEntity.ok(java.util.Map.of(
                "message", "새 이메일로 인증 메일을 발송했습니다. 이메일을 확인해주세요."
            ));
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(401).build();
        } catch (Exception e) {
            log.error("Failed to request email change: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(java.util.Map.of(
                "message", "이메일 변경 요청 처리 중 오류가 발생했습니다."
            ));
        }
    }

    /** ✅ 이메일 변경 인증 완료 */
    @GetMapping("/verify-email-change")
    @Transactional
    public ResponseEntity<?> verifyEmailChange(@RequestParam String token) {
        Optional<PendingEmailChange> maybe = pendingEmailChangeRepository.findByToken(token);
        if (maybe.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "유효하지 않은 토큰입니다."));
        }

        PendingEmailChange pending = maybe.get();

        // 토큰 만료 확인
        if (LocalDateTime.now().isAfter(pending.getExpiresAt())) {
            pendingEmailChangeRepository.delete(pending);
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "토큰이 만료되었습니다. 다시 요청해주세요."));
        }

        // 사용자 찾기
        Optional<SiteUser> userMaybe = userRepository.findById(pending.getUserId());
        if (userMaybe.isEmpty()) {
            pendingEmailChangeRepository.delete(pending);
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "사용자를 찾을 수 없습니다."));
        }

        // 이메일 중복 재확인
        if (userRepository.existsByEmail(pending.getNewEmail())) {
            pendingEmailChangeRepository.delete(pending);
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "이미 사용 중인 이메일입니다."));
        }

        // 이메일 변경
        SiteUser user = userMaybe.get();
        String oldEmail = user.getEmail();
        user.setEmail(pending.getNewEmail());
        user.setEmailVerified(true);
        userRepository.save(user);

        // 대기 요청 삭제
        pendingEmailChangeRepository.delete(pending);

        log.info("Email changed for user id={}, oldEmail={}, newEmail={}", user.getId(), oldEmail, pending.getNewEmail());

        return ResponseEntity.ok(java.util.Map.of(
            "message", "이메일이 성공적으로 변경되었습니다.",
            "newEmail", pending.getNewEmail()
        ));
    }

    /* ======================= 타 사용자 프로필 ======================= */

    /** ✅ 타 사용자 기본 정보 + 팔로잉/팔로워 수 + 내가 팔로우 중인지 여부 */
    @GetMapping("/{username}")
    public ResponseEntity<PublicUserDTO> userProfile(@PathVariable String username) {
        SiteUser target = findByUsername(username);
        String me = currentUsernameOrNull();
        
        // 본인이 자신의 프로필을 조회하는 경우 이메일 포함
        PublicUserDTO dto;
        if (me != null && me.equals(username)) {
            dto = PublicUserDTO.fromEntity(target);
        } else {
            // 타인 프로필 - 이메일 공개 설정에 따라 포함/제외
            dto = PublicUserDTO.forPublicView(target);
        }
        
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
                            created.setIntroduction(""); // 소개글 비워두기
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
            if (req.sex != null) me.setSex(normalizeSex(req.sex));
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