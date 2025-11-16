package com.example.BMN.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class CustomOAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        String redirect = "/user/login";
        try {
            if (exception instanceof OAuth2AuthenticationException) {
                OAuth2Error err = ((OAuth2AuthenticationException) exception).getError();
                if (err != null && err.getErrorCode() != null) {
                    String code = URLEncoder.encode(err.getErrorCode(), StandardCharsets.UTF_8);
                    String desc = err.getDescription() == null ? "" : URLEncoder.encode(err.getDescription(), StandardCharsets.UTF_8);
                    redirect = redirect + "?oauth_error=" + code + "&message=" + desc;
                } else {
                    redirect = redirect + "?oauth_error=unknown";
                }
            } else {
                redirect = redirect + "?oauth_error=unknown";
            }
        } catch (Exception e) {
            redirect = redirect + "?oauth_error=exception";
        }

        response.sendRedirect(redirect);
    }
}
