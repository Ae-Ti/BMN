// src/main/java/com/example/BMN/fridge/FridgeService.java
package com.example.BMN.fridge;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class FridgeService {
    private final IngredientRepository repo;
    private final UserRepository userRepository;

    public FridgeService(IngredientRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    private SiteUser me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) throw new AccessDeniedException("Unauthenticated");
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<Ingredient> list(String category) {
        SiteUser owner = me();
        if (category == null || category.equalsIgnoreCase("ALL")) {
            return repo.findAllByOwnerOrderByIdDesc(owner);
        }
        IngredientCategory cat = IngredientCategory.valueOf(category.toUpperCase());
        return repo.findAllByOwnerAndCategoryOrderByIdDesc(owner, cat);
    }

    // ✅ 이름만 반환 (Controller의 /items에서 사용)
    @Transactional(readOnly = true)
    public List<String> listNames(String category) {
        return list(category).stream()
                .map(Ingredient::getName)
                .filter(n -> n != null && !n.isBlank())
                .toList();
    }

    public Ingredient create(String name, Integer quantity, String unit, IngredientCategory category, LocalDate expireDate) {
        SiteUser owner = me();
        Ingredient i = new Ingredient();
        i.setName(name);
        i.setQuantity(quantity == null || quantity < 1 ? 1 : quantity);
        i.setUnit(unit);
        i.setCategory(category);
        i.setExpireDate(expireDate);
        i.setOwner(owner);
        return repo.save(i);
    }

    public Ingredient patch(Long id, Integer quantity, String name, String unit, IngredientCategory category, LocalDate expireDate) {
        SiteUser owner = me();
        Ingredient i = repo.findByIdAndOwner(id, owner)
                .orElseThrow(() -> new AccessDeniedException("Not found or not yours"));

        if (quantity != null && quantity >= 1) i.setQuantity(quantity);
        if (name != null) i.setName(name);
        if (unit != null) i.setUnit(unit);
        if (category != null) i.setCategory(category);
        if (expireDate != null) i.setExpireDate(expireDate);

        return i;
    }

    public void delete(Long id) {
        SiteUser owner = me();
        long n = repo.deleteByIdAndOwner(id, owner);
        if (n == 0) throw new AccessDeniedException("Not found or not yours");
    }
}