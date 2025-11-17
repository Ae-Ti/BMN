package com.example.BMN.User;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class JwtExceptionHandler {

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<Map<String,Object>> handleExpired(ExpiredJwtException ex) {
        return ResponseEntity.status(401).body(
                Map.of(
                        "status", 401,
                        "code", "TOKEN_EXPIRED",
                        "message", "토큰이 만료되었습니다."
                )
        );
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Map<String,Object>> handleJwt(JwtException ex) {
        return ResponseEntity.status(401).body(
                Map.of(
                        "status", 401,
                        "code", "INVALID_TOKEN",
                        "message", "유효하지 않은 토큰입니다."
                )
        );
    }
}
