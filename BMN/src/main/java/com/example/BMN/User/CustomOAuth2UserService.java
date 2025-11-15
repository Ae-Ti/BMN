package com.example.BMN.User;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private org.springframework.core.env.Environment environment;

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CustomOAuth2UserService.class);

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        log.debug("CustomOAuth2UserService.loadUser: start for registrationId={}", userRequest.getClientRegistration().getRegistrationId());
        OAuth2User oauth2User = delegate.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        log.debug("OAuth2 attributes: {}", attributes);

        // Google returns 'email' and 'sub' (subject)
        String email = (String) attributes.get("email");
        String name = (String) attributes.getOrDefault("name", email);

        if (email != null) {
            Optional<SiteUser> maybe = userRepository.findByUserName(email);
            String provider = userRequest.getClientRegistration().getRegistrationId(); // e.g. "google"
            String providerId = attributes.getOrDefault("sub", attributes.get("id")) != null
                    ? String.valueOf(attributes.getOrDefault("sub", attributes.get("id")))
                    : null;

            Boolean emailVerified = null;
            Object ev = attributes.get("email_verified");
            if (ev instanceof Boolean) emailVerified = (Boolean) ev;
            else if (ev instanceof String) emailVerified = Boolean.parseBoolean((String) ev);

            if (maybe.isEmpty()) {
                // create a local user with a random password (they'll authenticate via Google)
                String randomPassword = UUID.randomUUID().toString();
                try {
                    log.info("OAuth loadUser: creating local user for email={}", email);
                    // delegate to UserService to keep business rules
                    SiteUser created = userService.create(email, email, randomPassword, "구글 계정으로 생성된 사용자", null, null, null);
                    if (created == null) {
                        log.warn("OAuth loadUser: userService.create returned null for email={}", email);
                    } else {
                        // update provider fields
                        created.setProvider(provider);
                        created.setProviderId(providerId);
                        created.setEmailVerified(emailVerified);
                        // mark profile as incomplete so user is redirected to profile completion
                        created.setProfileComplete(false);
                        // set nickname from name or email prefix if nickname is empty
                        if (created.getNickname() == null || created.getNickname().isBlank()) {
                            String nick = name != null ? name : (email.contains("@") ? email.split("@")[0] : email);
                            created.setNickname(nick);
                        }
                        SiteUser saved = userRepository.saveAndFlush(created);
                        log.info("OAuth loadUser: created local user id={} username={}", saved.getId(), saved.getUserName());
                        // verify read-back
                        var check = userRepository.findByUserName(email);
                        log.debug("OAuth loadUser: post-save lookup present={}", check.isPresent());
                    }
                } catch (Exception ex) {
                    log.error("OAuth loadUser: failed to create local user for email={} message={}", email, ex.getMessage(), ex);
                    // In dev profile, rethrow so the failure is visible during development
                    try {
                        if (environment != null && environment.acceptsProfiles("dev")) {
                            throw new RuntimeException("Failed to create local user for " + email, ex);
                        }
                    } catch (Exception e) {
                        log.warn("Environment check failed while handling create exception: {}", e.getMessage());
                    }
                    // otherwise continue silently (possible concurrent creation)
                }
            } else {
                log.debug("OAuth loadUser: existing local user found for email={}", email);
                // ensure existing user has provider info set
                SiteUser existing = maybe.get();
                boolean changed = false;
                if (existing.getProvider() == null && provider != null) { existing.setProvider(provider); changed = true; }
                if (existing.getProviderId() == null && providerId != null) { existing.setProviderId(providerId); changed = true; }
                if (existing.getEmailVerified() == null && emailVerified != null) { existing.setEmailVerified(emailVerified); changed = true; }
                if ((existing.getNickname() == null || existing.getNickname().isBlank()) && name != null) { existing.setNickname(name); changed = true; }
                if (changed) userRepository.save(existing);
            }
        }

        String userNameAttributeName = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                attributes,
                userNameAttributeName
        );
    }
}
