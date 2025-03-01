package com.example.BMN.Main;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeDTO;
import com.example.BMN.Recipe.RecipeService;
import com.example.BMN.User.SiteUser;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.ui.Model;
import org.springframework.web.server.ResponseStatusException;

@RequiredArgsConstructor
@RequestMapping("/")
@Controller
public class MainController {

    private final RecipeService recipeService;
    private final UserService userService;

    @GetMapping("/recipe/data")
    public ResponseEntity<List<RecipeDTO>> getAllRecipes(Model model) {
        List<Recipe> recipeList = this.recipeService.findAll();
        //model.addAttribute("recipeList", recipeList);
        //return "test";
        List<RecipeDTO> recipeDTOList = recipeList.stream()
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok().body(recipeDTOList);
    }

    // 사용자의 즐겨찾기 레시피 조회
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/favorite/data/{userName}")
    public ResponseEntity<List<RecipeDTO>> getFavorite(@PathVariable String userName, Principal principal) {
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
        UserDTO userDTO = userService.getUserDTO(principal.getName());
        return ResponseEntity.ok(userDTO);
    }
/* 로그인 thymeleaf 임시페이지용

    @GetMapping("/user/login")
    public String login() {
        return "login_form";
    }
 */
}
