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

@RequiredArgsConstructor
@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final RecipeStepImageRepository recipeStepImageRepository; // ✅ 개별 삭제 처리용
    private final UserRepository userRepository;

    /* ========================= 작성자(업로더) ========================= */

    private SiteUser resolveCurrentAuthor(SiteUser fromController) {
        if (fromController != null) return fromController;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        String username = auth.getName();
        if (username == null || username.isBlank()) return null;

        return userRepository.findByUserName(username).orElse(null);
    }

    /* ========================= 생성 ========================= */

    @Transactional
    public Long createRecipe(
            String subject,
            List<RecipeIngredientDTO> ingredients,
            Integer cookingTimeMinutes,
            String description,
            String tools,
            Integer estimatedPrice,
            String content,
            MultipartFile thumbnail,
            List<MultipartFile> stepImages,
            List<String> captions,
            SiteUser authorFromController
    ) throws IOException {

        Recipe recipe = new Recipe();
        recipe.setSubject(subject);
        recipe.setCookingTimeMinutes(cookingTimeMinutes);
        recipe.setDescription(description);
        recipe.setTools(tools);
        recipe.setEstimatedPrice(estimatedPrice);
        recipe.setContent(content);
        recipe.setCreateDate(LocalDateTime.now());

        // 작성자
        SiteUser author = resolveCurrentAuthor(authorFromController);
        recipe.setAuthor(author);

        // 썸네일
        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        // 재료
        replaceIngredients(recipe, ingredients);

        // 스텝 이미지
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

    /* ========================= 수정 (보존 + 일부삭제 + 추가) ========================= */

    @Transactional
    public Long updateRecipeKeepStepsWithDelete(
            Long recipeId,
            String subject,
            List<RecipeIngredientDTO> ingredients,
            Integer cookingTimeMinutes,
            String description,
            String tools,
            Integer estimatedPrice,
            String content,
            MultipartFile thumbnail,
            List<MultipartFile> newStepImages,   // 새로 추가할 스텝
            List<String> captionsForNewSteps,    // 새 스텝 캡션
            List<Long> removeStepIds             // 삭제할 기존 스텝 ID 목록
    ) throws IOException {

        Recipe recipe = getRecipe(recipeId);

        // 작성자 검증
        SiteUser current = resolveCurrentAuthor(null);
        if (recipe.getAuthor() == null || current == null ||
                !Objects.equals(recipe.getAuthor().getId(), current.getId())) {
            throw new SecurityException("본인만 수정할 수 있습니다.");
        }

        // ✅ 보존 정책: null이 아닐 때만 갱신
        if (subject != null)             recipe.setSubject(subject);
        if (cookingTimeMinutes != null)  recipe.setCookingTimeMinutes(cookingTimeMinutes);
        if (description != null)         recipe.setDescription(description);
        if (tools != null)               recipe.setTools(tools);
        if (estimatedPrice != null)      recipe.setEstimatedPrice(estimatedPrice);
        if (content != null)             recipe.setContent(content);

        // 썸네일 교체 (있을 때만)
        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        // 재료 교체 (null이 아니면)
        if (ingredients != null) {
            replaceIngredients(recipe, ingredients);
        }

        // 1) 삭제 요청된 기존 스텝 제거
        if (removeStepIds != null && !removeStepIds.isEmpty()) {
            recipe.getStepImages().removeIf(s ->
                    s.getId() != null && removeStepIds.contains(s.getId())
            );
            for (Long sid : removeStepIds) {
                recipeStepImageRepository.findById(sid).ifPresent(si -> {
                    if (si.getRecipe() != null && Objects.equals(si.getRecipe().getId(), recipe.getId())) {
                        recipeStepImageRepository.delete(si);
                    }
                });
            }
        }

        // 2) 새 스텝 추가
        int nextIndex = recipe.getStepImages() == null ? 1 : recipe.getStepImages().size() + 1;
        if (newStepImages != null) {
            for (int i = 0; i < newStepImages.size(); i++) {
                MultipartFile f = newStepImages.get(i);
                if (f == null || f.isEmpty()) continue;

                RecipeStepImage step = new RecipeStepImage();
                step.setStepIndex(nextIndex++);
                step.setImage(f.getBytes());

                String cap = (captionsForNewSteps != null && captionsForNewSteps.size() > i)
                        ? captionsForNewSteps.get(i)
                        : null;
                step.setCaption(cap);

                recipe.addStepImage(step);
            }
        }

        // 3) stepIndex 재정렬
        if (recipe.getStepImages() != null) {
            recipe.getStepImages().sort(Comparator.comparing(
                    RecipeStepImage::getStepIndex,
                    Comparator.nullsLast(Integer::compareTo)
            ));
            int idx = 1;
            for (RecipeStepImage si : recipe.getStepImages()) {
                si.setStepIndex(idx++);
            }
        }

        return recipeRepository.save(recipe).getId();
    }

    /* ========================= 재료 교체 ========================= */

    @Transactional
    public void replaceIngredients(Recipe recipe, List<RecipeIngredientDTO> items) {
        if (recipe.getIngredientRows() != null) {
            recipe.getIngredientRows().clear();
        }

        if (items == null || items.isEmpty()) return;

        int posCounter = 0;
        for (RecipeIngredientDTO dto : items) {
            if (dto == null) continue;

            String name = dto.getName() == null ? "" : dto.getName().trim();
            if (name.isEmpty()) continue;

            String norm = IngredientNormalizer.normalizeOne(name);
            if (norm == null || norm.isBlank()) {
                norm = name.toLowerCase();
                if (norm.isBlank()) continue;
            }

            RecipeIngredient row = new RecipeIngredient();
            row.setName(name);
            row.setNameNorm(norm);
            row.setLink(dto.getLink());

            Integer pos = dto.getPosition();
            row.setPosition(pos != null ? pos : posCounter++);

            recipe.addIngredientRow(row);
        }

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

    // 전체 레시피 조회
    public List<Recipe> findAll() {
        return this.recipeRepository.findAll();
    }

    // ID 리스트로 조회
    public List<Recipe> findByIds(List<Long> recipeIds) {
        if (recipeIds == null || recipeIds.isEmpty()) {
            return Collections.emptyList();
        }
        return this.recipeRepository.findAllById(recipeIds);
    }

    /* ========================= 삭제 ========================= */

    @Transactional
    public void deleteRecipe(Long recipeId) {
        Recipe recipe = getRecipe(recipeId);

        SiteUser current = resolveCurrentAuthor(null);
        if (recipe.getAuthor() == null || current == null ||
                !Objects.equals(recipe.getAuthor().getId(), current.getId())) {
            throw new SecurityException("본인만 삭제할 수 있습니다.");
        }

        recipeRepository.delete(recipe);
    }
}