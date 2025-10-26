// src/main/java/com/example/BMN/mealplan/MealPlanDTO.java
package com.example.BMN.mealplan;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlanDTO {
    private Long id;

    private LocalDate planDate;

    /** 아침/점심/저녁/간식 */
    private String title;

    private String note;

    /** 레시피 연결 정보 */
    private Long recipeId;
    private String recipeTitle;
    private String thumbnailUrl;

    /** 같은 메뉴 중복 담기 → 수량으로 표현 */
    private Integer quantity;

    /** 같은 슬롯 내 정렬(선택) */
    private Integer position;
}