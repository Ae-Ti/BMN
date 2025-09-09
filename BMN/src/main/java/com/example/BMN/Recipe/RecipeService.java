package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import com.example.BMN.User.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class RecipeService {
    private final RecipeRepository recipeRepository;
    private final RecipeStepImageRepository recipeStepImageRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    @Transactional
    public Long createRecipe(
            String subject,
            String ingredients,
            Integer cookingTimeMinutes,
            String description,
            String tools,
            Integer estimatedPrice,
            String content,
            MultipartFile thumbnail,
            List<MultipartFile> stepImages,     // 파일 배열
            List<String> captions,              // 각 스텝 캡션(선택)
            SiteUser author                     // 로그인 유저(없으면 null 허용)
    ) throws IOException {

        Recipe recipe = new Recipe();
        recipe.setSubject(subject);
        recipe.setIngredients(ingredients);
        recipe.setCookingTimeMinutes(cookingTimeMinutes);
        recipe.setDescription(description);
        recipe.setTools(tools);
        recipe.setEstimatedPrice(estimatedPrice);
        recipe.setContent(content);
        recipe.setCreateDate(LocalDateTime.now());
        recipe.setAuthor(author);

        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        if (stepImages != null) {
            for (int i = 0; i < stepImages.size(); i++) {
                MultipartFile f = stepImages.get(i);
                if (f != null && !f.isEmpty()) {
                    RecipeStepImage step = new RecipeStepImage();
                    step.setStepIndex(i + 1); // 1부터
                    step.setImage(f.getBytes());

                    String cap = (captions != null && captions.size() > i) ? captions.get(i) : null;
                    step.setCaption(cap);

                    recipe.addStepImage(step); // FK 세팅 + 리스트 추가 (핵심)
                }
            }
        }

        return recipeRepository.save(recipe).getId(); // cascade 로 자식도 저장
    }



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

    // === [ADD] RecipeService.java : 레시피 메타 부분 수정(JSON) ===
    @Transactional
    public Recipe updateRecipeMeta(Long recipeId, RecipeUpdateRequest req) {
        Recipe recipe = getRecipe(recipeId);

        if (req.getTitle() != null) recipe.setSubject(req.getTitle());
        if (req.getDescription() != null) recipe.setDescription(req.getDescription());
        if (req.getTools() != null) recipe.setTools(req.getTools());
        if (req.getEstimatedPrice() != null) recipe.setEstimatedPrice(req.getEstimatedPrice());
        if (req.getContent() != null) recipe.setContent(req.getContent());

        return recipeRepository.save(recipe);
    }

    // === [ADD] RecipeService.java : 레시피 삭제 ===
    @Transactional
    public void deleteRecipe(Long recipeId) {
        Recipe recipe = getRecipe(recipeId);
        recipeRepository.delete(recipe);
    }

    // === [ADD] RecipeService.java : 단계 이미지 추가 (multipart) ===
    @Transactional
    public RecipeStepImage addStepImage(Long recipeId, Integer stepIndex, String caption, MultipartFile imageFile)
            throws IOException {
        Recipe recipe = getRecipe(recipeId);

        RecipeStepImage step = new RecipeStepImage();
        step.setRecipe(recipe);
        step.setStepIndex(stepIndex != null ? stepIndex : 0);
        step.setCaption(caption);

        if (imageFile != null && !imageFile.isEmpty()) {
            step.setImage(imageFile.getBytes());
        }

        return recipeStepImageRepository.save(step);
    }

    // === [ADD] RecipeService.java : 단계 이미지 수정 (multipart) ===
    @Transactional
    public RecipeStepImage updateStepImage(Long recipeId, Long stepId, Integer stepIndex, String caption,
                                           MultipartFile imageFile, boolean removeImage) throws IOException {
        Recipe recipe = getRecipe(recipeId);
        RecipeStepImage step = recipeStepImageRepository.findById(stepId)
                .orElseThrow(() -> new DataNotFoundException("step not found"));

        if (!step.getRecipe().getId().equals(recipe.getId())) {
            throw new IllegalArgumentException("해당 단계가 레시피에 속하지 않습니다.");
        }

        if (stepIndex != null) step.setStepIndex(stepIndex);
        if (caption != null) step.setCaption(caption);

        if (removeImage) {
            step.setImage(null);
        } else if (imageFile != null && !imageFile.isEmpty()) {
            step.setImage(imageFile.getBytes());
        }

        return recipeStepImageRepository.save(step);
    }

    // === [ADD] RecipeService.java : 단계 이미지 삭제 ===
    @Transactional
    public void deleteStepImage(Long recipeId, Long stepId) {
        Recipe recipe = getRecipe(recipeId);
        RecipeStepImage step = recipeStepImageRepository.findById(stepId)
                .orElseThrow(() -> new DataNotFoundException("step not found"));

        if (!step.getRecipe().getId().equals(recipe.getId())) {
            throw new IllegalArgumentException("해당 단계가 레시피에 속하지 않습니다.");
        }

        recipeStepImageRepository.delete(step);
    }
}
