// src/main/java/com/example/BMN/Ingredient/PriceCompareController.java
package com.example.BMN.Ingredient;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/price")
@CrossOrigin(origins = "http://localhost:3000")
public class PriceCompareController {

    private final NaverShoppingService service;

    public PriceCompareController(NaverShoppingService service) {
        this.service = service;
    }

    @PostMapping("/compare")
    public Map<String, List<NaverShopResponseDTO.Item>> compare(@RequestBody CompareRequestDTO req) {
        int n = (req.perIngredient == null || req.perIngredient < 1) ? 5 : req.perIngredient;
        boolean excludeUsed = req.excludeUsed == null || req.excludeUsed; // 기본 true
        List<String> ingredients = (req.ingredients == null) ? List.of() : req.ingredients;

        // ✅ 서비스는 (ingredients, perIngredient, excludeUsed) 3개 인자만 받습니다.
        return service.compareByIngredients(ingredients, n, excludeUsed);
    }
}