package com.example.BMN.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.security.Keys;
import java.security.Key;

import java.util.Date;

@Component
public class JwtUtil {

    private final long EXPIRATION_TIME = 1000 * 60 * 120; // 1시간 (토큰 만료 시간)

    Key key = Keys.secretKeyFor(SignatureAlgorithm.HS256);

    // ✅ 토큰 생성
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME)) // 만료 시간 설정 추가
                .signWith(key, SignatureAlgorithm.HS256) // ✅ 최신 방식 적용
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
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
