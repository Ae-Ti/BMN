// src/main/java/com/example/BMN/WebSpaForward.java
package com.example.BMN;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebSpaForward {

    // 프론트 라우트들만 추가 (API, 정적파일 제외)
    @GetMapping({
            "/", "/user/login", "/signup",
            "/household-ledger", "/post-create"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}