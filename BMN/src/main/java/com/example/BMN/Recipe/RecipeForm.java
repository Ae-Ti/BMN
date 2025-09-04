package com.example.BMN.Recipe;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
public class RecipeForm {
    @NotEmpty(message="제목은 필수항목입니다.")
    @Size(max=200)
    private String subject;

    @NotNull(message="대표사진은 필수입니다.")
    private MultipartFile thumbnail;

    @Size(max = 2000, message ="재료는 최대 2000자입니다.")
    private String ingredients;

    @NotNull(message = "소요시간은 필수입니다.")
    private Integer cookingTimeMinutes;

    @Size(max = 10000, message = "조리방법은 최대 10000자입니다.")
    private String description;

    @Size(max = 1000, message = "조리도구는 최대 1000자입니다.")
    private String tools;

    private List<MultipartFile> stepImages;

    @NotNull(message ="총예상가격은 필수입니다.")
    private Integer estimatedPrice;

    @Size(max = 10000, message ="추가설명은 최대 1000자입니다.")
    private String content;//선택
    //작성자는 넣지 않음 - 서버가 로그인 유저로 세팅
}
