package com.example.BMN.Main;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

import org.springframework.ui.Model;

@RequiredArgsConstructor
@RequestMapping("/main")
@Controller
public class MainController {

    private final RecipeService recipeService;

    @GetMapping("/")
    public ResponseEntity<List<Recipe>> getAllRecipes(Model model) {
        List<Recipe> recipeList = this.recipeService.findAll();
        //model.addAttribute("recipeList", recipeList);
        //return "test";
        return ResponseEntity.ok().body(recipeList);
    }
}

//nothing