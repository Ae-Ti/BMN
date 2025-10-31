package com.example.BMN.mealplan;

import lombok.Data;

@Data
public class MealPlanUpdateRequest {
    private String title;
    private Integer quantity;
    private String note;
}
