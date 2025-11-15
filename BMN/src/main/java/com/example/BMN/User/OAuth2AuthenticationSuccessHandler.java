package com.example.BMN.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import jakarta.servlet.http.Cookie;

import com.example.BMN.User.UserService;
import com.example.BMN.User.SiteUser;
import org.springframework.beans.factory.ObjectProvider;
import com.example.BMN.User.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2AuthenticationSuccessHandler.class);

    private final JwtUtil jwtUtil;
    private final ObjectProvider<UserRepository> userRepositoryProvider;

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, ObjectProvider<UserRepository> userRepositoryProvider) {
        this.jwtUtil = jwtUtil;
        this.userRepositoryProvider = userRepositoryProvider;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        Object principal = authentication.getPrincipal();
        String username = null;
        String name = null;
        if (principal instanceof OAuth2User) {
            OAuth2User user = (OAuth2User) principal;
            username = (String) user.getAttributes().get("email");
            name = (String) user.getAttributes().getOrDefault("name", null);
        }

        if (username == null) {
            // fallback to authentication name
            username = authentication.getName();
        }

        // Ensure a local user exists (upsert minimal fields) so later JWT-based lookups succeed
    log.info("OAuth2 success handler invoked for username='{}', name='{}'", username, name);
    log.debug("OAuth2 success for principal username='{}', name='{}'", username, name);
        try {
            UserRepository userRepository = userRepositoryProvider.getIfAvailable();
            if (userRepository == null) {
                log.warn("UserRepository bean is not available from provider; skipping user ensure step");
            } else {
                log.debug("UserRepository bean obtained from provider: {}", userRepository.getClass().getName());
                try {
                    var maybe = userRepository.findByUserName(username);
                    if (maybe.isPresent()) {
                        log.debug("Existing user found for username='{}' (id={})", username, maybe.get().getId());
                    } else {
                        log.info("No local user for '{}', creating minimal account via UserRepository", username);
                        try {
                            String randomPassword = java.util.UUID.randomUUID().toString();
                            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                            SiteUser created = new SiteUser();
                            created.setUserName(username);
                            created.setEmail(username);
                            created.setPassword(encoder.encode(randomPassword));
                            created.setIntroduction("구글 계정으로 생성된 사용자");
                            if (name != null && !name.isBlank()) created.setNickname(name);
                            else created.setNickname(username.contains("@") ? username.split("@")[0] : username);
                            created.setProvider((String) ((authentication.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) ? ((org.springframework.security.oauth2.core.user.OAuth2User)authentication.getPrincipal()).getAttributes().getOrDefault("iss", null) : null));
                            created.setProfileComplete(false);
                            // attempt to set providerId/emailVerified if available
                            if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.core.user.OAuth2User) {
                                var attr = ((org.springframework.security.oauth2.core.user.OAuth2User)authentication.getPrincipal()).getAttributes();
                                Object pid = attr.getOrDefault("sub", attr.get("id"));
                                if (pid != null) created.setProviderId(String.valueOf(pid));
                                Object ev = attr.get("email_verified");
                                if (ev instanceof Boolean) created.setEmailVerified((Boolean) ev);
                                else if (ev instanceof String) created.setEmailVerified(Boolean.parseBoolean((String) ev));
                            }
                            SiteUser saved = userRepository.saveAndFlush(created);
                            log.debug("Created minimal SiteUser id={} username={}", saved.getId(), saved.getUserName());
                            // verify read-back
                            var check = userRepository.findByUserName(username);
                            log.debug("Post-save lookup present={}", check.isPresent());
                        } catch (Exception createEx) {
                            log.error("Failed to create minimal user for '{}': {}", username, createEx.getMessage(), createEx);
                            // In dev, surface the error so it shows in logs/console and stops the flow for easier debugging
                            if (isDevProfileActive()) {
                                throw new RuntimeException("Failed to create minimal user for " + username, createEx);
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.error("Error while checking/creating user for '{}': {}", username, ex.getMessage(), ex);
                    if (isDevProfileActive()) {
                        throw new RuntimeException("Error while checking/creating user for " + username, ex);
                    }
                }
            }
        } catch (Exception outer) {
            log.error("Unexpected error while ensuring local user exists for '{}': {}", username, outer.getMessage(), outer);
            if (isDevProfileActive()) {
                throw new RuntimeException(outer);
            }
        }

        // Generate JWT for the user
        String token = jwtUtil.generateToken(username);

        // Also set an HttpOnly cookie so browsers send it automatically on subsequent requests.
        Cookie cookie = new Cookie("AUTH_TOKEN", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        // In local/dev environments Secure=false; in production set Secure=true and SameSite as needed
        cookie.setSecure(false);
        response.addCookie(cookie);

        // Redirect to frontend login handler with token in query param as well (frontend will read it for localStorage)
        String redirectUrl = "/user/login?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
        response.sendRedirect(redirectUrl);
    }

    private boolean isDevProfileActive() {
        try {
            String prop = System.getProperty("spring.profiles.active");
            if (prop != null && prop.contains("dev")) return true;
            String env = System.getenv("SPRING_PROFILES_ACTIVE");
            if (env != null && env.contains("dev")) return true;
        } catch (Exception e) {
            // ignore
        }
        return false;
    }
}
