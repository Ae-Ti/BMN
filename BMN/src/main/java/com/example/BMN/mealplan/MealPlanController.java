// src/main/java/com/example/BMN/mealplan/MealPlanController.java
package com.example.BMN.mealplan;

import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/mealplan")
@RequiredArgsConstructor
public class MealPlanController {

    private final MealPlanService mealService;

    /** 범위 조회: /api/mealplan?start=YYYY-MM-DD&end=YYYY-MM-DD */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MealPlanDTO>> range(
            Principal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        return ResponseEntity.ok(mealService.listByRange(principal.getName(), start, end));
    }

    /** 일자 조회: /api/mealplan/day?date=YYYY-MM-DD */
    @GetMapping("/day")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MealPlanDTO>> day(
            Principal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(mealService.listByDay(principal.getName(), date));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MealPlanDTO> update(
            Principal principal,
            @PathVariable Long id,
            @RequestBody MealPlanUpdateRequest req
    ) {
        MealPlanDTO updated = mealService.update(principal.getName(), id, req);
        return ResponseEntity.ok(updated);
    }

    /** 삭제 */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(Principal principal, @PathVariable Long id) {
        mealService.deleteHard(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    /** (선택) 수량 -1 */
    @PostMapping("/{id}/decrement")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MealPlanDTO> decrement(Principal principal, @PathVariable Long id) {
        MealPlanDTO dto = mealService.decrementOrDelete(principal.getName(), id);
        return ResponseEntity.ok(dto);
    }
}