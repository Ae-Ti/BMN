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
import jakarta.servlet.http.HttpServletRequest;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final Logger log = LoggerFactory.getLogger(EmailService.class);
    @Autowired(required = false)
    private JavaMailSender mailSender; // optional: app can run without SMTP configured

    @Value("${app.external.url:https://www.saltylife.co.kr}")
    private String appExternalUrl;
    @Value("${app.frontend.url:https://www.saltylife.co.kr}")
    private String appFrontendUrl;

    public void sendVerificationEmail(String email, String displayName, String token) {
    // Prefer frontend URL (SPA) first, then explicit external URL. Do NOT fall back to localhost.
    String base = (appFrontendUrl != null && !appFrontendUrl.isBlank() && !appFrontendUrl.contains("localhost")) ? appFrontendUrl
        : (appExternalUrl != null && !appExternalUrl.isBlank() && !appExternalUrl.contains("localhost") ? appExternalUrl : null);
        // Don't generate localhost links: require a configured public URL in production.
        if (base == null || base.isBlank() || base.contains("localhost")) {
            log.error("Refusing to generate verification link because base URL appears to be localhost or is not configured. Set app.external.url or app.frontend.url in production.");
            throw new IllegalStateException("No public base URL configured for verification links. Set app.external.url or app.frontend.url.");
        }
        String encoded = java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8);
        String verifyUrl = base + "/user/verify-email?token=" + encoded;

        if (mailSender == null) {
            log.warn("JavaMailSender bean not configured - skipping actual send. Verification URL: {}", verifyUrl);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("[라이프 매니저, 솔티] 이메일 인증 안내");
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

    /**
     * Request-aware version: prefers explicit external/frontend props, but when absent
     * will construct base from forwarded headers (X-Forwarded-Proto/Host) or request
     * scheme/host so deployed systems behind a proxy generate correct public links.
     */
    public void sendVerificationEmail(String email, String displayName, String token, HttpServletRequest request) {
        String base = null;
        if (appFrontendUrl != null && !appFrontendUrl.isBlank() && !appFrontendUrl.contains("localhost")) {
            base = appFrontendUrl;
        } else if (appExternalUrl != null && !appExternalUrl.isBlank() && !appExternalUrl.contains("localhost")) {
            base = appExternalUrl;
        } else if (request != null) {
            try {
                String proto = request.getHeader("X-Forwarded-Proto");
                if (proto == null || proto.isBlank()) proto = request.getScheme();
                String host = request.getHeader("X-Forwarded-Host");
                if (host == null || host.isBlank()) {
                    int port = request.getServerPort();
                    host = request.getServerName() + ((port == 80 || port == 443) ? "" : ":" + port);
                }
                base = proto + "://" + host;
            } catch (Exception ignored) {
                // leave base as null so we refuse to generate a localhost link
            }
        }

        // Don't generate localhost links: require a configured public URL in production.
        if (base == null || base.isBlank() || base.contains("localhost")) {
            log.error("Refusing to generate verification link because base URL appears to be localhost or is not configured. Set app.external.url or app.frontend.url in production.");
            throw new IllegalStateException("No public base URL configured for verification links. Set app.external.url or app.frontend.url.");
        }
        String encoded = java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8);
        String verifyUrl = base + "/user/verify-email?token=" + encoded;

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
            log.warn("Failed to send verification email (will log verification url): {}", ex.getMessage());
            log.info("Verification URL for {}: {}", Optional.ofNullable(email).orElse("(no-email)"), verifyUrl);
        }
    }

    /**
     * 이메일 변경 인증 메일 전송
     */
    public void sendEmailChangeVerification(String newEmail, String displayName, String token, HttpServletRequest request) {
        String base = null;
        if (appFrontendUrl != null && !appFrontendUrl.isBlank() && !appFrontendUrl.contains("localhost")) {
            base = appFrontendUrl;
        } else if (appExternalUrl != null && !appExternalUrl.isBlank() && !appExternalUrl.contains("localhost")) {
            base = appExternalUrl;
        } else if (request != null) {
            try {
                String proto = request.getHeader("X-Forwarded-Proto");
                if (proto == null || proto.isBlank()) proto = request.getScheme();
                String host = request.getHeader("X-Forwarded-Host");
                if (host == null || host.isBlank()) {
                    int port = request.getServerPort();
                    host = request.getServerName() + ((port == 80 || port == 443) ? "" : ":" + port);
                }
                base = proto + "://" + host;
            } catch (Exception ignored) {}
        }

        if (base == null || base.isBlank() || base.contains("localhost")) {
            log.error("Refusing to generate email change link because base URL appears to be localhost.");
            throw new IllegalStateException("No public base URL configured. Set app.external.url or app.frontend.url.");
        }

        String encoded = java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8);
        String verifyUrl = base + "/user/verify-email-change?token=" + encoded;

        if (mailSender == null) {
            log.warn("JavaMailSender bean not configured - skipping actual send. Email change URL: {}", verifyUrl);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(newEmail);
            message.setSubject("[솔티] 이메일 변경 인증 안내");
            message.setText("안녕하세요, " + (displayName == null ? "회원님" : displayName + "님") + "!\n\n" +
                    "이메일 변경을 요청하셨습니다. 아래 링크를 클릭하여 새 이메일을 인증해주세요:\n" + verifyUrl + "\n\n" +
                    "본인이 요청하지 않으셨다면 이 메일을 무시해주세요.\n" +
                    "링크는 발행 후 24시간 동안 유효합니다.\n\n감사합니다.");
            mailSender.send(message);
            log.info("Sent email change verification to {}", newEmail);
        } catch (Exception ex) {
            log.warn("Failed to send email change verification (will log url): {}", ex.getMessage());
            log.info("Email change verification URL for {}: {}", Optional.ofNullable(newEmail).orElse("(no-email)"), verifyUrl);
        }
    }
}
