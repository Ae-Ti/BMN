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
import org.springframework.core.env.Profiles;

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
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        // Only run Google-specific local user mapping. For other providers, return as-is.
        if (!"google".equalsIgnoreCase(registrationId)) {
            log.debug("CustomOAuth2UserService: registrationId {} is not 'google', skipping local user mapping", registrationId);
            return oauth2User;
        }

        log.debug("OAuth2 attributes: {}", attributes);

        // Google returns 'email' and 'sub' (subject)
        String email = (String) attributes.get("email");
        String name = (String) attributes.getOrDefault("name", email);

        if (email != null) {
            String provider = userRequest.getClientRegistration().getRegistrationId(); // e.g. "google"
            String providerId = attributes.getOrDefault("sub", attributes.get("id")) != null
                    ? String.valueOf(attributes.getOrDefault("sub", attributes.get("id")))
                    : null;

            // 1차: providerId로 사용자 찾기 (이메일 변경해도 동일 계정으로 인식)
            Optional<SiteUser> maybe = Optional.empty();
            if (provider != null && providerId != null) {
                maybe = userRepository.findByProviderAndProviderId(provider, providerId);
                if (maybe.isPresent()) {
                    log.debug("OAuth loadUser: found user by providerId={}", providerId);
                }
            }
            
            // 2차: providerId로 못 찾으면 이메일로 찾기 (기존 사용자 또는 이메일 변경 전 사용자)
            if (maybe.isEmpty()) {
                maybe = userRepository.findByUserName(email);
            }
            if (maybe.isEmpty()) {
                maybe = userRepository.findByEmail(email);
            }

            Boolean emailVerified = null;
            Object ev = attributes.get("email_verified");
            if (ev instanceof Boolean) emailVerified = (Boolean) ev;
            else if (ev instanceof String) emailVerified = Boolean.parseBoolean((String) ev);

            if (maybe.isEmpty()) {
                // No local user found here. Do not auto-create a local account at this stage; the
                // success handler will redirect to profile-complete where the user explicitly
                // finishes onboarding and the account is created.
                log.debug("OAuth loadUser: no local user found for email={}. Skipping auto-create.", email);
            } else {
                log.debug("OAuth loadUser: existing local user found for email={}", email);
                // ensure existing user has provider info set where appropriate
                SiteUser existing = maybe.get();
                boolean changed = false;
                if ((existing.getProvider() == null || existing.getProvider().isBlank()) && provider != null) { existing.setProvider(provider); changed = true; }
                if ((existing.getProviderId() == null || existing.getProviderId().isBlank()) && providerId != null) { existing.setProviderId(providerId); changed = true; }
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
