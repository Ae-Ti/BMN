package com.example.BMN.User;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final Logger log = LoggerFactory.getLogger(EmailService.class);
    @Autowired(required = false)
    private JavaMailSender mailSender; // optional: app can run without SMTP configured

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    public void sendVerificationEmail(String email, String displayName, String token) {
        String verifyUrl = appBaseUrl + "/user/verify-email?token=" + token;

        if (mailSender == null) {
            log.warn("JavaMailSender bean not configured - skipping actual send. Verification URL: {}", verifyUrl);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("[BMN] 이메일 인증 안내");
            message.setText("안녕하세요, 솔티입니다:) 회원가입을 진행해주셔서 감사합니다, " + (displayName == null ? "회원님" : displayName+"님") + "!\n\n" +
                    "회원가입을 완료하려면 아래 링크를 클릭하여 이메일을 인증해주세요:\n" + verifyUrl + "\n\n" +
                    "링크는 발행 후 24시간 동안 유효합니다.\n\n 신뢰받을 수 있는 서비스가 되도록 노력하겠습니다, 감사합니다.");
            mailSender.send(message);
            log.info("Sent verification email to {}", email);
        } catch (Exception ex) {
            // If mail sending fails (dev environment), log the URL so developer/tester can copy it
            log.warn("Failed to send verification email (will log verification url): {}", ex.getMessage());
            log.info("Verification URL for {}: {}", Optional.ofNullable(email).orElse("(no-email)"), verifyUrl);
        }
    }
}
