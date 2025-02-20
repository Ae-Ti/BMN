package com.example.BMN.Review;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.Recipe.RecipeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RequestMapping("/review")
@RequiredArgsConstructor
@Controller
public class ReviewController {

    private final RecipeService recipeService;
    private final ReviewService reviewService;

    @PostMapping("/create/{id}")
    public String createReview(Model model, @PathVariable("id") Integer id, @Valid ReviewForm reviewForm, BindingResult bindingresult){
        Recipe recipe = this.recipeService.getRecipe(id);
        if(bindingresult.hasErrors()){
            model.addAttribute("recipe", recipe);
            return "recipe_detail";
        }
        this.reviewService.create(recipe, reviewForm.getContent());
        return String.format("redirect:/recipe/detail/%s", id);
    }
}
