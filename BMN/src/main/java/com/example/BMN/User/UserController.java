package com.example.BMN.User;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.time.Instant;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("/user")
public class UserController {

    // Logger for this controller
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final EmailService emailService;
    @Value("${app.frontend.url:https://www.saltylife.co.kr}")
    private String frontendBaseUrl;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody UserCreateForm userCreateForm, HttpServletRequest request) {
        if (!userCreateForm.getPassword1().equals(userCreateForm.getPassword2())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        if (userRepository.existsByUserName(userCreateForm.getUserName()) || pendingRegistrationRepository.existsByUserName(userCreateForm.getUserName())) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }
        if (userRepository.existsByEmail(userCreateForm.getEmail()) || pendingRegistrationRepository.existsByEmail(userCreateForm.getEmail())) {
            throw new IllegalArgumentException("이미 등록된 이메일입니다.");
        }

        // 🔹 비밀번호 암호화는 UserService에서 수행하므로, 여기서 암호화하지 않음.
        java.time.LocalDate dob = null;
        try {
            Integer y = userCreateForm.getBirthYear();
            Integer m = userCreateForm.getBirthMonth();
            Integer d = userCreateForm.getBirthDay();
            if (y != null && m != null && d != null) {
                dob = java.time.LocalDate.of(y, m, d);
            }
        } catch (Exception ex) {
            // ignore malformed date; dob remains null
        }

        // Create pending registration (do not create SiteUser yet)
        PendingRegistration pr = new PendingRegistration();
        String verificationToken = UUID.randomUUID().toString();
        pr.setToken(verificationToken);
        pr.setUserName(userCreateForm.getUserName());
        pr.setEmail(userCreateForm.getEmail());
        pr.setPasswordHash(passwordEncoder.encode(userCreateForm.getPassword1()));
        pr.setIntroduction(userCreateForm.getIntroduction());
        pr.setNickname(userCreateForm.getNickname());
        pr.setDateOfBirth(dob);
        pr.setSex(userCreateForm.getSex());
        pr.setExpiryAt(Instant.now().plusSeconds(60 * 60 * 24));
        pendingRegistrationRepository.save(pr);
        // send verification email (email + display name)
        String display = pr.getNickname() != null ? pr.getNickname() : pr.getUserName();
    emailService.sendVerificationEmail(pr.getEmail(), display, verificationToken, request);

        return ResponseEntity.ok().body(new SignupResponse(null, "회원가입이 접수되었습니다. 이메일의 링크를 클릭하여 인증을 완료해주세요."));
        // 예외는 GlobalExceptionHandler가 처리
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        System.out.println("✅ 로그인 요청 받음");
        System.out.println("아이디: " + loginRequest.getUserName());
        System.out.println("비밀번호: " + loginRequest.getPassword());

        Optional<SiteUser> userOptional = userRepository.findByUserName(loginRequest.getUserName());

        if (userOptional.isEmpty()) {
            // For security, return a generic authentication failure (401) rather than revealing which part is wrong.
            return ResponseEntity.status(401).body(java.util.Map.of("message", "등록되지 않은 아이디 또는 비밀번호입니다."));
        }

        SiteUser user = userOptional.get();

        if (user.getEmailVerified() == null || Boolean.FALSE.equals(user.getEmailVerified())) {
            // Keep explicit message for email verification required
            throw new IllegalArgumentException("이메일 인증이 필요합니다. 이메일을 확인하세요.");
        }

        System.out.println("✅ 입력한 비밀번호: " + loginRequest.getPassword());
        System.out.println("✅ 저장된 해시 비밀번호: " + user.getPassword());

        // ✅ passwordEncoder 주입 확인
        if (passwordEncoder == null) {
            System.out.println("❌ PasswordEncoder가 주입되지 않음!");
            throw new RuntimeException("서버 오류: PasswordEncoder가 올바르게 주입되지 않았습니다.");
        }

        boolean isMatch = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());
        System.out.println("비밀번호 매칭 결과: " + isMatch);

        if (!isMatch) {
            // Return a unified 401 for authentication failures to match frontend behavior
            return ResponseEntity.status(401).body(java.util.Map.of("message", "등록되지 않은 아이디 또는 비밀번호입니다."));
        }

        // ✅ JWT 토큰 발급
        String token = jwtUtil.generateToken(user.getUserName());
        return ResponseEntity.ok().body(new LoginResponse(token, "로그인 성공"));
        // 예외는 GlobalExceptionHandler가 처리
    }

    /**
     * Refresh the JWT token. If the current token is still valid (not expired),
     * issue a new token with a fresh expiration time.
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(java.util.Map.of(
                "status", 401,
                "code", "NO_TOKEN",
                "message", "토큰이 없습니다."
            ));
        }
        String oldToken = authHeader.substring(7);
        try {
            // Validate the old token first
            if (!jwtUtil.validateToken(oldToken)) {
                return ResponseEntity.status(401).body(java.util.Map.of(
                    "status", 401,
                    "code", "TOKEN_EXPIRED",
                    "message", "토큰이 만료되었습니다."
                ));
            }
            String username = jwtUtil.extractUsername(oldToken);
            // Issue a new token
            String newToken = jwtUtil.generateToken(username);
            log.info("Token refreshed for user: {}", username);
            return ResponseEntity.ok().body(java.util.Map.of(
                "token", newToken,
                "message", "토큰이 갱신되었습니다."
            ));
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            return ResponseEntity.status(401).body(java.util.Map.of(
                "status", 401,
                "code", "TOKEN_EXPIRED",
                "message", "토큰이 만료되었습니다."
            ));
        } catch (Exception e) {
            log.warn("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(java.util.Map.of(
                "status", 401,
                "code", "INVALID_TOKEN",
                "message", "유효하지 않은 토큰입니다."
            ));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token, HttpServletRequest request) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "토큰 파라미터가 필요합니다."));
        }

        try {
            Optional<PendingRegistration> maybe = pendingRegistrationRepository.findByToken(token);
            if (maybe.isEmpty()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "유효하지 않거나 이미 사용된 토큰입니다."));
            }
            PendingRegistration pr = maybe.get();
            if (pr.getExpiryAt() != null && pr.getExpiryAt().isBefore(Instant.now())) {
                pendingRegistrationRepository.delete(pr);
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "토큰이 만료되었습니다. 다시 가입을 시도해 주세요."));
            }

            if (pr.getUserName() == null || pr.getEmail() == null) {
                pendingRegistrationRepository.delete(pr);
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "가입 정보가 불완전합니다. 다시 시도해 주세요."));
            }

            // final uniqueness check (race-safe)
            if (userRepository.existsByUserName(pr.getUserName()) || userRepository.existsByEmail(pr.getEmail())) {
                // cleanup pending
                pendingRegistrationRepository.delete(pr);
                return ResponseEntity.status(409).body(java.util.Map.of("message", "이미 존재하는 아이디 또는 이메일입니다."));
            }

            // create actual user with hashed password stored in pending
            SiteUser created = userService.createFromPending(pr);
            pendingRegistrationRepository.delete(pr);

            String jwt = jwtUtil.generateToken(created.getUserName());

            // If the request likely comes from a browser (Accept contains text/html), redirect to frontend success page.
            // Use a sensible fallback: if frontendBaseUrl is the default dev server (localhost:3000) and
            // the backend is serving the SPA (index.html under resources/static), redirect to the backend-hosted
            // path so the SPA will handle the route. This avoids redirecting to a dev server that may not be running.
            String accept = request.getHeader("Accept");
            boolean isHtml = accept != null && accept.contains("text/html");
            if (isHtml) {
                String redirectUrl;
                try {
                    if (frontendBaseUrl != null && !frontendBaseUrl.isBlank() && !frontendBaseUrl.contains("localhost:3000")) {
                        redirectUrl = frontendBaseUrl + "/verify-success?status=success";
                    } else {
                        // Build base URL from the current request (scheme://host[:port]) so the SPA served by backend can be used
                        String scheme = request.getScheme();
                        String host = request.getServerName();
                        int port = request.getServerPort();
                        String base = scheme + "://" + host + ((port == 80 || port == 443) ? "" : ":" + port);
                        redirectUrl = base + "/verify-success?status=success";
                    }
                } catch (Exception e) {
                    redirectUrl = "/verify-success?status=success";
                }
                return ResponseEntity.status(302).location(URI.create(redirectUrl)).build();
            }

            return ResponseEntity.ok().body(new VerifyResponse(jwt, "이메일 인증 및 가입이 완료되었습니다."));
        } catch (Exception ex) {
            log.error("Error during verifyEmail: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(java.util.Map.of("message", "서버 오류가 발생했습니다."));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendRequest req, HttpServletRequest request) {
        String email = req == null ? null : req.email;
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "이메일을 입력하세요."));
        }
        var maybe = pendingRegistrationRepository.findByEmail(email);
        if (maybe.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "해당 이메일로 진행 중인 가입 요청이 없습니다."));
        }
        PendingRegistration pr = maybe.get();
        String verificationToken = UUID.randomUUID().toString();
        pr.setToken(verificationToken);
        pr.setExpiryAt(Instant.now().plusSeconds(60 * 60 * 24));
        pendingRegistrationRepository.save(pr);
        String display = pr.getNickname() != null ? pr.getNickname() : pr.getUserName();
    emailService.sendVerificationEmail(pr.getEmail(), display, verificationToken, request);
        return ResponseEntity.ok(java.util.Map.of("message", "인증 메일을 재전송했습니다."));
    }

    /**
     * Returns verification status for a given email.
     * { verified: boolean, created: boolean }
     */
    @GetMapping("/verify-status")
    public ResponseEntity<?> verifyStatus(@RequestParam("email") String email) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "email 파라미터가 필요합니다."));
        }
        var maybe = userRepository.findByEmail(email);
        if (maybe.isEmpty()) {
            return ResponseEntity.ok(java.util.Map.of("verified", false, "created", false));
        }
        SiteUser u = maybe.get();
        boolean verified = u.getEmailVerified() != null && u.getEmailVerified();
        return ResponseEntity.ok(java.util.Map.of("verified", verified, "created", true));
    }

    public static class ResendRequest {
        public String email;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String userName;
        private String password;
    }

    @Getter
    @AllArgsConstructor
    public static class LoginResponse {
        private String token;
        private String message;
    }

    @Getter
    @AllArgsConstructor
    public static class SignupResponse {
        private String token;
        private String message;
    }

    @Getter
    @AllArgsConstructor
    public static class VerifyResponse {
        private String token;
        private String message;
    }
}