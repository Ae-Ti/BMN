package com.example.BMN.Recipe;

import com.example.BMN.Review.ReviewForm;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/recipe")
@RequiredArgsConstructor
@Controller
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping("/list")
    public String list(Model model, @RequestParam(value="page", defaultValue="0") int page){
        Page<Recipe> paging = this.recipeService.getList(page);
        model.addAttribute("paging", paging);
        return "testt";
    }


    @GetMapping(value="/detail/{id}")
    public String detail(Model model, @PathVariable("id") Integer id, ReviewForm reviewForm){
        Recipe recipe = this.recipeService.getRecipe(id);
        model.addAttribute("recipe", recipe);
        return "recipe_detail";
    }

    @GetMapping("/create")
    public String recipeCreate(RecipeForm recipeform){
        return "recipe_form";
    }

    @PostMapping("/create")
    public String recipeCreate(@Valid RecipeForm recipeForm, BindingResult bindingResult){
        if(bindingResult.hasErrors()){
            return "recipe_form";
        }
        this.recipeService.create(recipeForm.getSubject(), recipeForm.getContent());
        return "redirect:/recipe/list";//레시피 저장 후 레시피 목록으로 이동
    }


}
