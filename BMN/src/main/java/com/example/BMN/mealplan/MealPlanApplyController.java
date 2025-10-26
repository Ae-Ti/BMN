// src/main/java/com/example/BMN/mealplan/MealPlanApplyController.java
package com.example.BMN.mealplan;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/mealplan/apply-purchases")
@RequiredArgsConstructor
public class MealPlanApplyController {

    private final MealPlanService mealService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MealPlanDTO> apply(Principal principal, @RequestBody ApplyReq req){
        MealPlanDTO dto = MealPlanDTO.builder()
                .planDate(req.getPlanDate())
                .title(req.getTitle())       // "아침/점심/저녁/간식"
                .recipeId(req.getRecipeId()) // 같은 레시피면 수량 +1
                .note(req.getNote())
                .build();
        return ResponseEntity.ok(mealService.upsertIncreaseQuantity(principal.getName(), dto));
    }

    @Getter @Setter
    public static class ApplyReq {
        private LocalDate planDate;
        private String title;
        private Long recipeId;
        private String note;
    }
}