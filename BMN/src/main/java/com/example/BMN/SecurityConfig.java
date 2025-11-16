package com.example.BMN;

import com.example.BMN.User.JwtAuthenticationFilter;
import com.example.BMN.User.JwtUtil;
import com.example.BMN.User.CustomOAuth2UserService;
import com.example.BMN.User.OAuth2AuthenticationSuccessHandler;
import com.example.BMN.User.UserService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.frameoptions.XFrameOptionsHeaderWriter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
public class  SecurityConfig {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, OAuth2AuthenticationSuccessHandler oauth2SuccessHandler) throws Exception {
        http
                .authorizeHttpRequests((authorizeHttpRequests) -> authorizeHttpRequests
                        .requestMatchers(new AntPathRequestMatcher("/**")).permitAll())
                .csrf(csrf -> csrf.disable())
                .headers((headers) -> headers
                        .addHeaderWriter(new XFrameOptionsHeaderWriter(
                                XFrameOptionsHeaderWriter.XFrameOptionsMode.SAMEORIGIN)))
        .formLogin(form -> form.disable()) // 기본 로그인 폼 비활성화 (프론트엔드 사용 시 필요)
        .oauth2Login(oauth2 -> oauth2
            // use the custom OAuth2 user service to map external users to local accounts
            .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService()))
            // handle successful authentication (issue JWT, redirect)
            .successHandler(oauth2SuccessHandler)
            // handle failures (e.g. email already exists)
            .failureHandler(new com.example.BMN.User.CustomOAuth2AuthenticationFailureHandler())
            // optional: set custom login page path
            .loginPage("/user/login")
        )
                .logout(logout -> logout.logoutUrl("/user/logout").logoutSuccessUrl("/"))
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class); // ✅ JWT 필터 적용

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil, userDetailsService);
    }

    @Bean
    public CustomOAuth2UserService customOAuth2UserService() {
        return new CustomOAuth2UserService();
    }

    @Bean
    public OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler(ObjectProvider<com.example.BMN.User.UserRepository> userRepositoryProvider) {
        return new OAuth2AuthenticationSuccessHandler(jwtUtil, userRepositoryProvider);
    }

}
