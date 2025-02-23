package com.example.BMN.Main;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeService;
import com.example.BMN.User.SiteUser;
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

import org.springframework.ui.Model;
import org.springframework.web.server.ResponseStatusException;

@RequiredArgsConstructor
@RequestMapping("/")
@Controller
public class MainController {

    private final RecipeService recipeService;
    private final UserService userService;

    @GetMapping("/recipe/data")
    public ResponseEntity<List<Recipe>> getAllRecipes(Model model) {
        List<Recipe> recipeList = this.recipeService.findAll();
        //model.addAttribute("recipeList", recipeList);
        //return "test";
        return ResponseEntity.ok().body(recipeList);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{userName}/favorite/data")
    public ResponseEntity<List<Recipe>> getFavorite(Model model, @PathVariable String userName, Principal principal) {
        List<Recipe> favoriteList = this.userService.getUser(principal.getName()).getFavorite();
        return ResponseEntity.ok().body(favoriteList);
    }
}

//nothing