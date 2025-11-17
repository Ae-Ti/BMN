package com.example.BMN.User;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import java.util.Collections;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        String token = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // try to read token from cookie named AUTH_TOKEN (set by OAuth success handler)
            if (request.getCookies() != null) {
                for (jakarta.servlet.http.Cookie c : request.getCookies()) {
                    if ("AUTH_TOKEN".equals(c.getName())) {
                        try {
                            token = URLDecoder.decode(c.getValue(), StandardCharsets.UTF_8.toString());
                        } catch (Exception e) {
                            token = c.getValue();
                        }
                        break;
                    }
                }
            }
        }

        if (token == null) {
            chain.doFilter(request, response);
            return;
        }
        String userName = null;

        try {
            userName = jwtUtil.extractUsername(token);
            System.out.println("🔹 JWT 사용자 이름 추출 성공: " + userName);
        } catch (ExpiredJwtException eje) {
            System.out.println("⏰ JWT 만료: " + eje.getMessage());
            // Respond with JSON { status:401, code: "TOKEN_EXPIRED", message: "토큰이 만료되었습니다." }
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            ObjectMapper mapper = new ObjectMapper();
            String body = mapper.writeValueAsString(java.util.Map.of(
                    "status", 401,
                    "code", "TOKEN_EXPIRED",
                    "message", "토큰이 만료되었습니다."
            ));
            response.getWriter().write(body);
            return;
        } catch (Exception e) {
            System.out.println("❌ JWT 검증 실패: " + e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            ObjectMapper mapper = new ObjectMapper();
            String body = mapper.writeValueAsString(java.util.Map.of(
                    "status", 401,
                    "code", "INVALID_TOKEN",
                    "message", "유효하지 않은 토큰입니다."
            ));
            response.getWriter().write(body);
            return;
        }

        if (userName != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userName);

                if (jwtUtil.validateToken(token)) {
                    Authentication auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    System.out.println("✅ 인증 성공! SecurityContext에 저장됨");
                } else {
                    System.out.println("❌ 유효하지 않은 토큰");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    ObjectMapper mapper = new ObjectMapper();
                    String body = mapper.writeValueAsString(java.util.Map.of(
                            "status", 401,
                            "code", "INVALID_TOKEN",
                            "message", "유효하지 않은 토큰입니다."
                    ));
                    response.getWriter().write(body);
                    return;
                }
            } catch (Exception e) {
                // If user is not present in local DB (OAuth-first flow), still allow the request
                // to proceed by creating a lightweight Authentication based on the JWT subject.
                System.out.println("❌ 사용자 인증 실패: " + e.getMessage() + " — 시도: JWT 기반 임시 인증 생성");
                try {
                    if (jwtUtil.validateToken(token)) {
                        Authentication auth = new UsernamePasswordAuthenticationToken(
                                userName, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_PREAUTH"))
                        );
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        System.out.println("⚠️ 임시 JWT 인증이 SecurityContext에 설정되었습니다 (사용자 로컬 레코드 없음)");
                    } else {
                        System.out.println("❌ 유효하지 않은 토큰 (임시 인증 생성 실패)");
                    }
                } catch (Exception ex) {
                    System.out.println("❌ 임시 인증 생성 중 예외: " + ex.getMessage());
                }
            }
        }

        chain.doFilter(request, response);
    }
}