// src/main/java/com/example/BMN/mypage/MyPageController.java
package com.example.BMN.mypage;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/me")
public class MyPageController {
    private final RecipeRepository recipeRepository;
    private final UserRepository userRepository;

    public MyPageController(RecipeRepository recipeRepository, UserRepository userRepository) {
        this.recipeRepository = recipeRepository;
        this.userRepository = userRepository;
    }

    private SiteUser me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) throw new AccessDeniedException("Unauthenticated");
        return userRepository.findByUserName(auth.getName())
                .orElseThrow(() -> new AccessDeniedException("User not found"));
    }

    record MyRecipeDto(Long id, String subject, String createdAt) {
        static MyRecipeDto of(Recipe r) {
            var created = r.getCreateDate() == null ? null :
                    r.getCreateDate().atZone(ZoneId.systemDefault()).toInstant().toString();
            return new MyRecipeDto(r.getId(), r.getSubject(), created);
        }
    }

    @GetMapping("/recipes")
    public List<MyRecipeDto> myRecipes() {
        var owner = me();
        return recipeRepository.findAllByAuthorOrderByIdDesc(owner).stream()
                .map(MyRecipeDto::of)
                .toList();
    }
}