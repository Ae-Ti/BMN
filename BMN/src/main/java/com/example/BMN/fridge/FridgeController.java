// src/main/java/com/example/BMN/fridge/FridgeController.java
package com.example.BMN.fridge;

import com.example.BMN.Recipe.RecipeMatchDTO;
import com.example.BMN.Recipe.RecipeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080"})
@RestController
@RequestMapping("/api/fridge")
public class FridgeController {

    private final FridgeService service;
    private final RecipeService recipeService;

    public FridgeController(FridgeService service, RecipeService recipeService) {
        this.service = service;
        this.recipeService = recipeService;
    }

    /* ========================= DTOs ========================= */
    record IngredientDto(Long id, String name, Integer quantity, String unit, String category, String expireDate) {
        static IngredientDto of(Ingredient i) {
            return new IngredientDto(
                    i.getId(),
                    i.getName(),
                    i.getQuantity(),
                    i.getUnit(),
                    i.getCategory().name(),
                    i.getExpireDate() == null ? null : i.getExpireDate().toString()
            );
        }
    }
    record CreateReq(String name, Integer quantity, String unit, String category,
                     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expireDate) {}
    record PatchReq(String name, Integer quantity, String unit, String category,
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expireDate) {}

    /* ========================= 냉장고 CRUD ========================= */
    @GetMapping("/ingredients")
    public List<IngredientDto> list(@RequestParam(defaultValue = "ALL") String category) {
        return service.list(category).stream().map(IngredientDto::of).toList();
    }

    // ✅ 보유 재료의 "이름만" 반환하는 경량 엔드포인트
    // GET /api/fridge/items?category=ALL
    @GetMapping("/items")
    public List<String> listItemNames(@RequestParam(defaultValue = "ALL") String category) {
        // service.listNames는 사용자/카테고리 필터링까지 수행
        List<String> names = service.listNames(category);

        // 공백/대소문자 차이 중복 제거를 위해 LinkedHashSet으로 정리 (원본 순서 유지)
        LinkedHashSet<String> uniq = new LinkedHashSet<>();
        for (String n : names) {
            if (n == null) continue;
            String normalized = n.trim();
            if (!normalized.isEmpty()) uniq.add(normalized);
        }
        return List.copyOf(uniq);
    }

    @PostMapping("/ingredients")
    public IngredientDto create(@RequestBody CreateReq req) {
        var created = service.create(
                req.name(),
                req.quantity(),
                req.unit(),
                IngredientCategory.valueOf(req.category().toUpperCase()),
                req.expireDate()
        );
        return IngredientDto.of(created);
    }

    @PatchMapping("/ingredients/{id}")
    public IngredientDto patch(@PathVariable Long id, @RequestBody PatchReq req) {
        var updated = service.patch(
                id,
                req.quantity(),
                req.name(),
                req.unit(),
                req.category() == null ? null : IngredientCategory.valueOf(req.category().toUpperCase()),
                req.expireDate()
        );
        return IngredientDto.of(updated);
    }

    @DeleteMapping("/ingredients/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    /* ========================= 추천 레시피 ========================= */

    /** GET: /api/fridge/recommend?limit=24 */
    @GetMapping("/recommend")
    public List<RecipeMatchDTO> recommendGet(@RequestParam(defaultValue = "24") int limit) {
        return recipeService.recommendByFridge(limit);
    }

    /** POST: /api/fridge/recommend  (JSON body: {"limit": 24} 또는 쿼리스트링) */
    @PostMapping("/recommend")
    public List<RecipeMatchDTO> recommendPost(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(value = "limit", required = false) Integer limitQuery
    ) {
        int limit = 24;
        if (limitQuery != null) {
            limit = limitQuery;
        } else if (body != null && body.get("limit") != null) {
            try { limit = Integer.parseInt(String.valueOf(body.get("limit"))); } catch (NumberFormatException ignored) {}
        }
        return recipeService.recommendByFridge(limit);
    }
}