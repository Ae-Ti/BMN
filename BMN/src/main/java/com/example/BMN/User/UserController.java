package com.example.BMN.User;

import jakarta.validation.Valid;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody UserCreateForm userCreateForm) {
        if (!userCreateForm.getPassword1().equals(userCreateForm.getPassword2())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        if (userRepository.existsByUserName(userCreateForm.getUserName())) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        // 🔹 비밀번호 암호화는 UserService에서 수행하므로, 여기서 암호화하지 않음.
        SiteUser newUser = userService.create(
                userCreateForm.getUserName(),
                userCreateForm.getEmail(),
                userCreateForm.getPassword1(), // ✅ 여기서는 평문 비밀번호 전달 (서비스에서 암호화)
                userCreateForm.getIntroduction(),
                userCreateForm.getNickname(),
                userCreateForm.getAge(),
                userCreateForm.getSex()
        );

        String token = jwtUtil.generateToken(newUser.getUserName());
        return ResponseEntity.ok().body(new SignupResponse(token, "회원가입 성공"));
        // 예외는 GlobalExceptionHandler가 처리
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        System.out.println("✅ 로그인 요청 받음");
        System.out.println("아이디: " + loginRequest.getUserName());
        System.out.println("비밀번호: " + loginRequest.getPassword());

        Optional<SiteUser> userOptional = userRepository.findByUserName(loginRequest.getUserName());

        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 사용자입니다.");
        }

        SiteUser user = userOptional.get();

        System.out.println("✅ 입력한 비밀번호: " + loginRequest.getPassword());
        System.out.println("✅ 저장된 해시 비밀번호: " + user.getPassword());

        // ✅ passwordEncoder 주입 확인
        if (passwordEncoder == null) {
            System.out.println("❌ PasswordEncoder가 주입되지 않음!");
            throw new RuntimeException("서버 오류: PasswordEncoder가 올바르게 주입되지 않았습니다.");
        }

        boolean isMatch = passwordEncoder.matches(loginRequest.getPassword(), user.getPassword());
        System.out.println("비밀번호 매칭 결과: " + isMatch);

        if (!isMatch) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // ✅ JWT 토큰 발급
        String token = jwtUtil.generateToken(user.getUserName());
        return ResponseEntity.ok().body(new LoginResponse(token, "로그인 성공"));
        // 예외는 GlobalExceptionHandler가 처리
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String userName;
        private String password;
    }

    @Getter
    @AllArgsConstructor
    public static class LoginResponse {
        private String token;
        private String message;
    }

    @Getter
    @AllArgsConstructor
    public static class SignupResponse {
        private String token;
        private String message;
    }
}