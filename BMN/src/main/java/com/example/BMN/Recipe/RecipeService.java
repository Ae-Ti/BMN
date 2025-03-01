package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import jakarta.transaction.Transactional;
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
    private final UserRepository userRepository;

    public Page<Recipe> getList(int page) {
        List<Sort.Order> sorts = new ArrayList<>();
        sorts.add(Sort.Order.desc("createDate"));
        Pageable pageable = PageRequest.of(page, 10, Sort.by(sorts));
        return this.recipeRepository.findAll(pageable);
    }

    public Recipe getRecipe(Long id){
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

    public List<Recipe> findAll() {
        return recipeRepository.findAll();
    }

    @Transactional
    public void addRecipeToFavorites(String userName, Long recipeId) {

        if (userName == null || userName.isEmpty()) {
            System.out.println("로그인되지 않은 상태에서 실행됩니다.");
            return; // 로그인 필요 예외 발생하지 않도록 처리
        }

        SiteUser user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));

        if (!user.getFavorite().contains(recipe)) {
            user.getFavorite().add(recipe);
            userRepository.save(user);
        }
    }

    // ID 리스트를 기반으로 여러 개의 레시피 조회
    public List<Recipe> findByIds(List<Long> recipeIds) {
        return recipeRepository.findByIdIn(recipeIds);
    }

}
