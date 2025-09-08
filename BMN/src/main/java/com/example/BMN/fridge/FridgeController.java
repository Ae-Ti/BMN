// src/main/java/com/example/BMN/fridge/FridgeController.java
package com.example.BMN.fridge;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/fridge/ingredients")
public class FridgeController {
    private final FridgeService service;

    public FridgeController(FridgeService service) {
        this.service = service;
    }

    record IngredientDto(Long id, String name, Integer quantity, String unit, String category, String expireDate) {
        static IngredientDto of(Ingredient i) {
            return new IngredientDto(
                    i.getId(), i.getName(), i.getQuantity(), i.getUnit(),
                    i.getCategory().name(),
                    i.getExpireDate() == null ? null : i.getExpireDate().toString()
            );
        }
    }
    record CreateReq(String name, Integer quantity, String unit, String category,
                     @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expireDate) {}
    record PatchReq(String name, Integer quantity, String unit, String category,
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expireDate) {}

    @GetMapping
    public List<IngredientDto> list(@RequestParam(defaultValue = "ALL") String category) {
        return service.list(category).stream().map(IngredientDto::of).toList();
    }

    @PostMapping
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

    @PatchMapping("/{id}")
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

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}