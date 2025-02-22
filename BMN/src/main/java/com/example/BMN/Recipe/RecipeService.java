package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;

    public Page<Recipe> getList(int page) {
        List<Sort.Order> sorts = new ArrayList<>();
        sorts.add(Sort.Order.desc("createDate"));
        Pageable pageable = PageRequest.of(page, 10, Sort.by(sorts));
        return this.recipeRepository.findAll(pageable);
    }

    public Recipe getRecipe(Integer id){
        Optional<Recipe> recipe = this.recipeRepository.findById(id);
        if(recipe.isPresent()){
            return recipe.get();
        }else{
            throw new DataNotFoundException("recipe not found");
        }
    }



    public void create(String subject, String content){
        Recipe r = new Recipe();
        r.setSubject(subject);
        r.setContent(content);
        r.setCreateDate(LocalDateTime.now());
        this.recipeRepository.save(r);
    }


}
