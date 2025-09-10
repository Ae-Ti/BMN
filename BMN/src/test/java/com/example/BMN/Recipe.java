package com.example.BMN;

import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.Recipe.RecipeStepImageRepository;
import com.example.BMN.User.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.Commit;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class RecipeIntegrationTest {
/*
    @Autowired Mㅇㅇ
    ockMvc mockMvc;
    @Autowired UserService userService;
    @Autowired
    RecipeRepository recipeRepository;
    @Autowired
    RecipeStepImageRepository stepImageRepository;

    @BeforeEach
    void setUp() {
        // 테스트용 사용자(컨트롤러가 @AuthenticationPrincipal 사용 시 필요)
        try {
            userService.create("testuser", "test@bmn.com", "Passw0rd!",
                    "intro", "nick", 30L, "M");
        } catch (Exception ignored) {}
    }

    @Test
    @WithMockUser(username = "testuser") // 🔐 보안 필터 껐어도 SecurityContext 주입돼서 @AuthenticationPrincipal 동작
    void uploadRecipe_withThumbnailAndMultipleSteps_OK() throws Exception {
        // 썸네일 1장
        MockMultipartFile thumb = new MockMultipartFile(
                "thumbnail", "thumb.jpeg", MediaType.IMAGE_JPEG_VALUE, "thumb".getBytes());

        // 스텝 이미지 N장 (필드명: stepImages)
        MockMultipartFile step1 = new MockMultipartFile(
                "stepImages", "s1.jpg", MediaType.IMAGE_JPEG_VALUE, "s1".getBytes());
        MockMultipartFile step2 = new MockMultipartFile(
                "stepImages", "s2.jpg", MediaType.IMAGE_JPEG_VALUE, "s2".getBytes());
        MockMultipartFile step3 = new MockMultipartFile(
                "stepImages", "s3.jpg", MediaType.IMAGE_JPEG_VALUE, "s3".getBytes());

        ResultActions resultActions = mockMvc.perform(
                        // 컨트롤러가 @RequestMapping("/recipe") + @PostMapping("/create") 라면 URL은 /recipe/create
                        multipart("/recipe/create")
                                .file(thumb)
                                .file(step1).file(step2).file(step3)
                                .param("subject", "테스트 비빔밥")
                                .param("ingredients", "밥, 고추장, 나물")
                                .param("cookingTimeMinutes", "15")
                                .param("description", "비비면 끝")
                                .param("tools", "그릇, 숟가락")
                                .param("estimatedPrice", "5500")
                                .param("content", "참기름 조금!")
                                .with(csrf()) // 안전하게 추가 (필터 꺼도 무해)
                                .contentType(MediaType.MULTIPART_FORM_DATA)
                )
                .andDo(print())
                .andExpect(status().isOk());

        // DB 검증
        var recipes = recipeRepository.findAll();
        assertThat(recipes).isNotEmpty();
        var saved = recipes.get(recipes.size() - 1);
        assertThat(saved.getSubject()).isEqualTo("테스트 비빔밥");

        long stepCount = stepImageRepository.findAll().stream()
                .filter(s -> s.getRecipe().getId().equals(saved.getId()))
                .count();
        assertThat(stepCount).isEqualTo(3);
    }*/
}
