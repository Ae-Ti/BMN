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
        try {
            if (!userCreateForm.getPassword1().equals(userCreateForm.getPassword2())) {
                return ResponseEntity.badRequest().body("비밀번호가 일치하지 않습니다.");
            }

            userService.create(
                    userCreateForm.getUserName(),
                    userCreateForm.getEmail(),
                    userCreateForm.getPassword1(),
                    userCreateForm.getIntroduction(),
                    userCreateForm.getNickname(),
                    userCreateForm.getAge(),
                    userCreateForm.getSex()
            );
            return ResponseEntity.ok().body("회원가입 성공");
        } catch (Exception e) {
            e.printStackTrace(); // 🛠 예외 로그 출력
            return ResponseEntity.badRequest().body("회원가입 실패: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        System.out.println("✅ 로그인 요청 받음");
        System.out.println("아이디: " + loginRequest.getUserName());
        System.out.println("비밀번호: " + loginRequest.getPassword());

        try {
            Optional<SiteUser> userOptional = userRepository.findByUserName(loginRequest.getUserName());

            if (userOptional.isEmpty()) {
                return ResponseEntity.badRequest().body("존재하지 않는 사용자입니다.");
            }

            SiteUser user = userOptional.get();

            if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                return ResponseEntity.badRequest().body("비밀번호가 일치하지 않습니다.");
            }

            // ✅ JWT 토큰 발급
            String token = jwtUtil.generateToken(user.getUserName());
            return ResponseEntity.ok().body(new LoginResponse(token, "로그인 성공"));

        } catch (Exception e) {
            e.printStackTrace(); // 🛠 예외 로그 출력
            return ResponseEntity.status(500).body("서버 오류: " + e.getMessage());
        }
    }

    // ✅ `static` 추가 (Spring이 바인딩할 수 있도록)
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
}