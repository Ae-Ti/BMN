package com.example.BMN.Main;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeDTO;
import com.example.BMN.Recipe.RecipeService;
import com.example.BMN.User.UserDTO;
import com.example.BMN.User.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.security.Principal;
import java.util.List;
import org.springframework.web.server.ResponseStatusException;

@RequiredArgsConstructor
@RequestMapping("/")
@Controller
public class MainController {

    private final RecipeService recipeService;
    private final UserService userService;

    @GetMapping("/recipe/data")
    public ResponseEntity<List<RecipeDTO>> getAllRecipes() {
        List<Recipe> recipeList = this.recipeService.findAll();
        List<RecipeDTO> recipeDTOList = recipeList.stream()
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok().body(recipeDTOList);
    }

    // 사용자의 즐겨찾기 레시피 조회
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/favorite/data/{userName}")
    public ResponseEntity<List<RecipeDTO>> getFavorite(@PathVariable String userName, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증되지 않은 사용자입니다.");
        }

        if (!principal.getName().equals(userName)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<Long> favoriteRecipeIds = userService.getFavoriteRecipeIds(userName);
        List<Recipe> recipeList = recipeService.findByIds(favoriteRecipeIds);
        List<RecipeDTO> recipeDTOList = recipeList.stream()
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok(recipeDTOList);
    }

    // 로그인한 사용자 정보 조회
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/user/info")
    public ResponseEntity<UserDTO> getUserInfo(Principal principal) {
        if (principal == null) {
            System.out.println("🚨 Principal이 NULL입니다. 토큰을 확인하세요.");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증되지 않은 사용자입니다.");
        }
        System.out.println("✅ 현재 로그인한 사용자: " + principal.getName());

        UserDTO userDTO = userService.getUserDTO(principal.getName());
        return ResponseEntity.ok(userDTO);
    }
}
