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
        String providerId = null;
        String registrationId = null;
        if (principal instanceof OAuth2User) {
            OAuth2User user = (OAuth2User) principal;
            username = (String) user.getAttributes().get("email");
            name = (String) user.getAttributes().getOrDefault("name", null);
            Object sub = user.getAttributes().getOrDefault("sub", user.getAttributes().get("id"));
            if (sub != null) providerId = String.valueOf(sub);
        }

        // determine provider/registration id (if available) and only run the Google-specific logic
        try {
            if (authentication instanceof org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) {
                registrationId = ((org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();
            }
        } catch (Exception e) {
            // ignore
        }

        if (registrationId == null || !"google".equalsIgnoreCase(registrationId)) {
            log.info("OAuth2 success handler: provider '{}' is not google — skipping local user ensure and JWT issuance", registrationId);
            // For non-Google providers, redirect to root without issuing JWT
            response.sendRedirect("/");
            return;
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
                    if (maybe.isEmpty()) {
                        // also try by email to avoid missing existing accounts when userName != email
                        maybe = userRepository.findByEmail(username);
                    }
                    if (maybe.isPresent()) {
                        // Existing local user found — authenticate immediately. We no longer perform
                        // a separate link/password flow; OAuth login will log into the existing account.
                        SiteUser existing = maybe.get();
                        log.info("OAuth success handler: existing user found for '{}' -> local userName='{}'. Logging in.", username, existing.getUserName());
                        String token = jwtUtil.generateToken(existing.getUserName());
                        Cookie cookie = new Cookie("AUTH_TOKEN", token);
                        cookie.setHttpOnly(true);
                        cookie.setPath("/");
                        cookie.setSecure(false);
                        response.addCookie(cookie);
                        String redirectUrl = "http://localhost:8080/user/login?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
                        response.sendRedirect(redirectUrl);
                        return;
                    } else {
                        // No local user found: do NOT create DB user here.
                        // Instead, issue a JWT for the OAuth identity and redirect the browser
                        // to the profile completion page. The profile completion endpoint will
                        // create the persistent SiteUser when the user submits the form.
                        log.info("No local user for '{}'. Deferring DB creation until profile completion. Redirecting to profile completion.", username);
                        try {
                            String token = jwtUtil.generateToken(username);
                            Cookie temp = new Cookie("AUTH_TOKEN", token);
                            temp.setHttpOnly(true);
                            temp.setPath("/");
                            temp.setSecure(false);
                            response.addCookie(temp);
                            String redirectUrl = "http://localhost:8080/profile/complete?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
                            response.sendRedirect(redirectUrl);
                            return;
                        } catch (Exception e) {
                            log.error("Failed to issue token for deferred OAuth user {}: {}", username, e.getMessage(), e);
                        }
                    }
                } catch (Exception ex) {
                    log.error("Error while checking user for '{}': {}", username, ex.getMessage(), ex);
                    if (isDevProfileActive()) {
                        throw new RuntimeException("Error while checking user for " + username, ex);
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
    String redirectUrl = "http://localhost:8080/user/login?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
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
