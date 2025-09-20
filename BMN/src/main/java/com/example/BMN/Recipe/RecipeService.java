package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

/**
 * RecipeService (작성자 자동 세팅 + 재료 rows 저장 포함 최신본)
 */
@RequiredArgsConstructor
@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final RecipeStepImageRepository recipeStepImageRepository;
    private final UserRepository userRepository;

    /* ========================= 작성자(업로더) 해석 ========================= */

    /** 컨트롤러에서 넘긴 author가 없으면 SecurityContext로부터 username을 꺼내 DB에서 SiteUser 조회 */
    private SiteUser resolveCurrentAuthor(SiteUser fromController) {
        if (fromController != null) return fromController;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        String username = auth.getName();
        if (username == null || username.isBlank()) return null;

        return userRepository.findByUserName(username).orElse(null);
    }

    /* ========================= 생성/수정/삭제 ========================= */

    @Transactional
    public Long createRecipe(
            String subject,
            List<RecipeIngredientDTO> ingredients,  // [{name, link, position}]
            Integer cookingTimeMinutes,
            String description,
            String tools,
            Integer estimatedPrice,
            String content,
            MultipartFile thumbnail,
            List<MultipartFile> stepImages,         // 스텝 이미지들
            List<String> captions,                  // 각 스텝 캡션 (선택)
            SiteUser authorFromController           // 컨트롤러 주입값(없을 수 있음)
    ) throws IOException {

        Recipe recipe = new Recipe();
        recipe.setSubject(subject);
        recipe.setCookingTimeMinutes(cookingTimeMinutes);
        recipe.setDescription(description);
        recipe.setTools(tools);
        recipe.setEstimatedPrice(estimatedPrice);
        recipe.setContent(content);
        recipe.setCreateDate(LocalDateTime.now());

        // ✅ 업로더 설정(컨트롤러 값 없으면 SecurityContext로 보완)
        SiteUser author = resolveCurrentAuthor(authorFromController);
        recipe.setAuthor(author);

        // 썸네일
        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        // 재료 rows 저장
        replaceIngredients(recipe, ingredients);

        // 스텝 이미지 저장
        if (stepImages != null) {
            for (int i = 0; i < stepImages.size(); i++) {
                MultipartFile f = stepImages.get(i);
                if (f == null || f.isEmpty()) continue;

                RecipeStepImage step = new RecipeStepImage();
                step.setStepIndex(i + 1);
                step.setImage(f.getBytes());

                String cap = (captions != null && captions.size() > i) ? captions.get(i) : null;
                step.setCaption(cap);

                recipe.addStepImage(step);
            }
        }

        return recipeRepository.save(recipe).getId();
    }

    /**
     * 기존 재료 rows 비우고 새로 채우기.
     * name이 비거나 정규화 결과가 비면 스킵한다.
     */
    @Transactional
    public void replaceIngredients(Recipe recipe, List<RecipeIngredientDTO> items) {
        // 모두 제거 (orphanRemoval=true 이므로 DB에서도 정리됨)
        if (recipe.getIngredientRows() != null) {
            recipe.getIngredientRows().clear();
        }

        if (items == null || items.isEmpty()) return;

        int posCounter = 0;
        for (RecipeIngredientDTO dto : items) {
            if (dto == null) continue;

            String name = dto.getName() == null ? "" : dto.getName().trim();
            if (name.isEmpty()) continue;

            // 정규화 (static 메서드명: normalizeOne)
            String norm = IngredientNormalizer.normalizeOne(name);
            if (norm == null || norm.isBlank()) {
                // 혹시라도 제거 규칙으로 전부 날아갔다면 최소한 소문자/trim 으로 fallback
                norm = name.toLowerCase();
                if (norm.isBlank()) continue;
            }

            RecipeIngredient row = new RecipeIngredient();
            row.setName(name);
            row.setNameNorm(norm);  // NOT NULL
            row.setLink(dto.getLink());

            Integer pos = dto.getPosition();
            row.setPosition(pos != null ? pos : posCounter++);

            recipe.addIngredientRow(row); // 양방향 세팅 + 리스트 추가
        }

        // 보장된 정렬
        if (recipe.getIngredientRows() != null) {
            recipe.getIngredientRows().sort(Comparator.comparing(
                    RecipeIngredient::getPosition,
                    Comparator.nullsLast(Integer::compareTo)
            ));
        }
    }

    /* ========================= 조회 ========================= */

    public Page<Recipe> getList(int page) {
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Order.desc("createDate")));
        return this.recipeRepository.findAll(pageable);
    }

    public Recipe getRecipe(Long id) {
        return this.recipeRepository.findById(id)
                .orElseThrow(() -> new DataNotFoundException("recipe not found"));
    }

    public List<Recipe> findAll() {
        return recipeRepository.findAll();
    }

    public List<Recipe> findByIds(List<Long> recipeIds) {
        return recipeRepository.findByIdIn(recipeIds);
    }

    /* ========================= 즐겨찾기 ========================= */

    @Transactional
    public void addRecipeToFavorites(String userName, Long recipeId) {
        if (userName == null || userName.isBlank()) return;

        SiteUser user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found"));

        if (!user.getFavorite().contains(recipe)) {
            user.getFavorite().add(recipe);
            userRepository.save(user);
        }
    }

    /* ========================= 메타 수정/삭제 ========================= */

    @Transactional
    public Recipe updateRecipeMeta(Long recipeId, RecipeUpdateRequest req) {
        Recipe recipe = getRecipe(recipeId);

        if (req.getTitle() != null)           recipe.setSubject(req.getTitle());
        if (req.getDescription() != null)     recipe.setDescription(req.getDescription());
        if (req.getTools() != null)           recipe.setTools(req.getTools());
        if (req.getEstimatedPrice() != null)  recipe.setEstimatedPrice(req.getEstimatedPrice());
        if (req.getContent() != null)         recipe.setContent(req.getContent());
        // 필요 시 cookingTimeMinutes 등 추가

        return recipeRepository.save(recipe);
    }

    @Transactional
    public void deleteRecipe(Long recipeId) {
        Recipe recipe = getRecipe(recipeId);
        recipeRepository.delete(recipe);
    }

    /* ========================= 스텝 이미지 CRUD ========================= */

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

    @Transactional
    public RecipeStepImage updateStepImage(Long recipeId, Long stepId, Integer stepIndex, String caption,
                                           MultipartFile imageFile, boolean removeImage) throws IOException {
        Recipe recipe = getRecipe(recipeId);
        RecipeStepImage step = recipeStepImageRepository.findById(stepId)
                .orElseThrow(() -> new DataNotFoundException("step not found"));

        if (!Objects.equals(step.getRecipe().getId(), recipe.getId())) {
            throw new IllegalArgumentException("해당 단계가 레시피에 속하지 않습니다.");
        }

        if (stepIndex != null) step.setStepIndex(stepIndex);
        if (caption != null)   step.setCaption(caption);

        if (removeImage) {
            step.setImage(null);
        } else if (imageFile != null && !imageFile.isEmpty()) {
            step.setImage(imageFile.getBytes());
        }

        return recipeStepImageRepository.save(step);
    }

    @Transactional
    public void deleteStepImage(Long recipeId, Long stepId) {
        Recipe recipe = getRecipe(recipeId);
        RecipeStepImage step = recipeStepImageRepository.findById(stepId)
                .orElseThrow(() -> new DataNotFoundException("step not found"));

        if (!Objects.equals(step.getRecipe().getId(), recipe.getId())) {
            throw new IllegalArgumentException("해당 단계가 레시피에 속하지 않습니다.");
        }

        recipeStepImageRepository.delete(step);
    }
}