package com.example.BMN.comment;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * 🔒 현재 Security 설정(JwtAuthenticationFilter) 기반:
 *  - principal: UserDetails 객체 (id가 없을 수 있음)
 *  - id 없을 경우 userName 으로 DB 조회
 */
@Component
@RequiredArgsConstructor
public class CommentSecuritySupport {

    private final UserRepository userRepository;

    public Long currentUserId(Authentication auth) {
        if (auth == null) {
            auth = SecurityContextHolder.getContext().getAuthentication();
        }
        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("로그인이 필요합니다.");
        }

        Object principal = auth.getPrincipal();

        // 1️⃣ CustomUserDetails 등에 getId()가 있으면 그걸 우선 사용
        try {
            var getId = principal.getClass().getMethod("getId");
            Object idObj = getId.invoke(principal);
            if (idObj != null) {
                return Long.valueOf(String.valueOf(idObj));
            }
        } catch (NoSuchMethodException ignore) {
            // getId()가 없는 경우 아래로 이동
        } catch (Exception e) {
            throw new RuntimeException("인증 정보에서 ID 추출 실패: " + e.getMessage());
        }

        // 2️⃣ 기본 UserDetails (id 없음) → userName으로 DB 조회
        String userName = extractUserName(principal);
        if (userName == null || userName.isBlank()) {
            throw new RuntimeException("인증 정보에 사용자명이 없습니다.");
        }

        SiteUser user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다: " + userName));

        return user.getId();
    }

    private String extractUserName(Object principal) {
        try {
            // 대부분 UserDetails 구현체는 getUsername()을 가짐
            var getUsername = principal.getClass().getMethod("getUsername");
            Object nameObj = getUsername.invoke(principal);
            if (nameObj != null) {
                return String.valueOf(nameObj);
            }
        } catch (Exception ignore) {
        }

        // 혹시 문자열로 들어오는 경우 (드물지만 대비)
        if (principal instanceof String s) {
            return s;
        }
        return null;
    }
}