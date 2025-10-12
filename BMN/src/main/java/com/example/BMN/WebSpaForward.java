// src/main/java/com/example/BMN/WebSpaForward.java
package com.example.BMN;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebSpaForward {

    /**
     * React SPA 라우팅을 위한 포워드 컨트롤러
     * 백엔드 API(/api/**, /recipe/** 등)나 정적 리소스는 제외하고
     * 나머지 클라이언트 라우트는 모두 index.html로 포워드
     */
    @GetMapping({
            "/",                          // 메인
            "/user/login", "/user/join",  // 사용자
            "/signup", "/mypage", "/profile/**",        // 마이페이지
            "/recipes", "/recipes/{id}",  // 레시피 목록 / 상세
            "/recipe-list", "/recipe-detail/{id}",
            "/fridge", "/ingredient",     // 냉장고 / 식재료
            "/household-ledger",          // 가계부
            "/post-create",               // 게시글 작성
            "/favorites", "/favorites/**", // 즐겨찾기 관련
            "/"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}