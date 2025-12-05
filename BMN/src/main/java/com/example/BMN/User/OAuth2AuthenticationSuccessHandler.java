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
    private final String frontendBaseUrl;

    public OAuth2AuthenticationSuccessHandler(JwtUtil jwtUtil, ObjectProvider<UserRepository> userRepositoryProvider, String frontendBaseUrl) {
        this.jwtUtil = jwtUtil;
        this.userRepositoryProvider = userRepositoryProvider;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    /**
     * Add a simple cookie for OAuth provider info (used during profile completion).
     */
    private void addOAuthInfoCookie(HttpServletResponse response, String name, String value, boolean secure) {
        try {
            String encoded = URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
            StringBuilder sb = new StringBuilder();
            sb.append(name).append("=").append(encoded).append("; Path=/; HttpOnly; Max-Age=3600;");
            if (secure) {
                sb.append(" Secure; SameSite=None;");
            } else {
                sb.append(" SameSite=Lax;");
            }
            response.addHeader("Set-Cookie", sb.toString());
        } catch (Exception e) {
            log.warn("Failed to add {} cookie: {}", name, e.getMessage());
        }
    }

    /**
     * Add AUTH_TOKEN cookie via Set-Cookie header so we can include SameSite and Max-Age attributes.
     * If secure==true we set SameSite=None (required for cross-site usage like OAuth redirects).
     * If secure==false we fall back to SameSite=Lax to avoid modern browser rejection.
     */
    private void addAuthCookie(HttpServletResponse response, String token, long expirationMs, boolean secure) {
        try {
            long maxAge = Math.max(0L, expirationMs / 1000L);
            String encoded = URLEncoder.encode(token, StandardCharsets.UTF_8.toString());
            String cookieDomain = null;
            try {
                if (frontendBaseUrl != null && !frontendBaseUrl.isBlank()) {
                    java.net.URI u = new java.net.URI(frontendBaseUrl);
                    String host = u.getHost();
                    if (host != null && host.endsWith("saltylife.co.kr")) {
                        cookieDomain = ".saltylife.co.kr";
                    }
                }
            } catch (Exception e) {
                // ignore parse errors and proceed without explicit Domain
            }

            StringBuilder sb = new StringBuilder();
            sb.append("AUTH_TOKEN=").append(encoded).append(";");
            if (cookieDomain != null) {
                sb.append(" Domain=").append(cookieDomain).append(";");
            }
            sb.append(" Path=/; HttpOnly; Max-Age=").append(maxAge).append(";");
            if (secure) {
                sb.append(" Secure; SameSite=None;");
            } else {
                sb.append(" SameSite=Lax;");
            }
            // Add header (note: response.addCookie doesn't allow SameSite attribute on older Servlet API)
            response.addHeader("Set-Cookie", sb.toString());
        } catch (Exception e) {
            log.warn("Failed to add auth cookie header: {}", e.getMessage());
        }
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
                    // First try to find by providerId (stable Google sub ID that doesn't change even if email changes)
                    var maybe = (providerId != null && registrationId != null)
                            ? userRepository.findByProviderAndProviderId(registrationId, providerId)
                            : java.util.Optional.<SiteUser>empty();
                    if (maybe.isEmpty()) {
                        // Fallback: try by userName
                        maybe = userRepository.findByUserName(username);
                    }
                    if (maybe.isEmpty()) {
                        // also try by email to avoid missing existing accounts when userName != email
                        maybe = userRepository.findByEmail(username);
                    }
                    if (maybe.isPresent()) {
                        // Existing local user found — authenticate immediately. We no longer perform
                        // a separate link/password flow; OAuth login will log into the existing account.
                        SiteUser existing = maybe.get();
                        
                        // Update provider info if missing (for existing users who don't have providerId yet)
                        boolean changed = false;
                        if ((existing.getProvider() == null || existing.getProvider().isBlank()) && registrationId != null) {
                            existing.setProvider(registrationId);
                            changed = true;
                        }
                        if ((existing.getProviderId() == null || existing.getProviderId().isBlank()) && providerId != null) {
                            existing.setProviderId(providerId);
                            changed = true;
                        }
                        if (changed) {
                            userRepository.save(existing);
                            log.info("OAuth success handler: updated provider info for user '{}' (provider={}, providerId={})", existing.getUserName(), registrationId, providerId);
                        }
                        
                        log.info("OAuth success handler: existing user found for '{}' -> local userName='{}'. Logging in.", username, existing.getUserName());
                        String token = jwtUtil.generateToken(existing.getUserName());
                        boolean secureCookie = isRequestSecure(request);
                        addAuthCookie(response, token, jwtUtil.getExpirationMs(), secureCookie);
                        String redirectUrl = buildRedirectUrl(request, "/", token);
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
                            boolean secure = isRequestSecure(request);
                            addAuthCookie(response, token, jwtUtil.getExpirationMs(), secure);
                            // Store provider info in cookies so profile completion can save them
                            if (registrationId != null) {
                                addOAuthInfoCookie(response, "OAUTH_PROVIDER", registrationId, secure);
                            }
                            if (providerId != null) {
                                addOAuthInfoCookie(response, "OAUTH_PROVIDER_ID", providerId, secure);
                            }
                            String redirectUrl = buildRedirectUrl(request, "/account/setup", token);
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
    boolean secure = isRequestSecure(request);
    addAuthCookie(response, token, jwtUtil.getExpirationMs(), secure);

        // Redirect to frontend login handler with token in query param as well (frontend will read it for localStorage)
    String redirectUrl = buildRedirectUrl(request, "/", token);
    response.sendRedirect(redirectUrl);
    }

    private String buildRedirectUrl(HttpServletRequest request, String path, String token) {
        String base = null;
        try {
            if (frontendBaseUrl != null && !frontendBaseUrl.isBlank() && !frontendBaseUrl.contains("localhost")) {
                base = frontendBaseUrl;
            } else {
                String proto = request.getHeader("X-Forwarded-Proto");
                if (proto == null || proto.isBlank()) proto = request.getScheme();
                String host = request.getHeader("X-Forwarded-Host");
                if (host == null || host.isBlank()) {
                    int port = request.getServerPort();
                    host = request.getServerName() + ((port == 80 || port == 443) ? "" : ":" + port);
                }
                base = proto + "://" + host;
            }
        } catch (Exception e) {
            base = "";
        }
        String encoded = URLEncoder.encode(token, StandardCharsets.UTF_8);
        return base + path + "?token=" + encoded;
    }

    private boolean isRequestSecure(HttpServletRequest request) {
        try {
            String proto = request.getHeader("X-Forwarded-Proto");
            if (proto != null) return proto.equalsIgnoreCase("https");
            return request.isSecure();
        } catch (Exception e) {
            return false;
        }
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
