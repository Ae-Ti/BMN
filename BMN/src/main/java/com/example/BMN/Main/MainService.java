package com.example.BMN.Main;

import com.example.BMN.Recipe.Recipe;
import com.example.BMN.Recipe.RecipeRepository;
import com.example.BMN.User.SiteUser;
import org.springframework.stereotype.Service;

@Service
public class MainService {
    private RecipeRepository recipeRepository;

    public void vote(Recipe recipe, SiteUser siteUser) {
        recipe.getFavorite().add(siteUser);
        this.recipeRepository.save(recipe);
    }
}
