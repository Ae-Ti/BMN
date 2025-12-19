// src/main/java/com/example/BMN/WebSpaForward.java
package com.example.BMN;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.servlet.http.HttpServletRequest;

@Controller
public class WebSpaForward {

    /**
     * React SPA 라우팅을 위한 포워드 컨트롤러
     * 백엔드 API(/api/**, /recipe/** 등)나 정적 리소스는 제외하고
     * 나머지 클라이언트 라우트는 모두 index.html로 포워드
     * 
     * 주의: forward 시 query string이 유지되도록 처리
     */
    @GetMapping({
            "/",                          // 메인
            "/user/login", "/user/join",  // 사용자
            "/user/verify-email-change-result",  // 이메일 변경 결과 페이지
            "/signup", "/mypage", "/profile/**", "/profile-complete",        // 마이페이지
            "/account/setup",             // 프로필 완성 (OAuth)
            "/recipes", "/recipes/{id}",  // 레시피 목록 / 상세
            "/recipes/create",            // 레시피 생성
            "/recipe-list", "/recipe-detail/{id}",
            "/fridge", "/ingredient",     // 냉장고 / 식재료
            "/household-ledger",          // 가계부
            "/post-create", "/recipes/edit/{id}",              // 게시글 작성
            "/favorites", "/favorites/**", // 즐겨찾기 관련
        "/main", "/meal",
        "/verify-success",
        "/verify-instructions",
            "/settings",
            "/RecipeMain",
            "/guide"

    })
    public String forwardToIndex(HttpServletRequest request) {
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            return "forward:/index.html?" + queryString;
        }
        return "forward:/index.html";
    }
}