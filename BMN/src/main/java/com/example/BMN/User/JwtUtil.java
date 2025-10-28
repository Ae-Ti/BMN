package com.example.BMN.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.security.Keys;
import java.security.Key;

import java.util.Date;
import org.springframework.beans.factory.annotation.Value;

@Component
public class JwtUtil {

    @Value("${jwt.secret:change-me-dev-secret-change-me-dev-secret}")
    private String secret;

    @Value("${jwt.expiration:7200000}") // 기본 2시간 (ms)
    private long expirationMs;

    private Key getSigningKey() {
        // HS256은 최소 256bit 키 필요
        byte[] keyBytes = secret.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ✅ 토큰 생성
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // ✅ 토큰에서 사용자명 추출
    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    // ✅ 토큰 유효성 검증
    public boolean validateToken(String token) {
        return getClaims(token).getExpiration().after(new Date());
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
