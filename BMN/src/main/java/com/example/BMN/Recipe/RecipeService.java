package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import com.example.BMN.fridge.Ingredient;
import com.example.BMN.fridge.IngredientRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final RecipeStepImageRepository recipeStepImageRepository;
    private final UserRepository userRepository;

    // ✅ 추가: 냉장고 재료 조회용
    private final IngredientRepository ingredientRepository;

    /* ---------------- 공통 유틸 ---------------- */

    private SiteUser resolveCurrentAuthor(SiteUser fromController) {
        if (fromController != null) return fromController;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        String username = auth.getName();
        if (username == null || username.isBlank()) return null;
        return userRepository.findByUserName(username).orElse(null);
    }

    /* ---------------- 생성 ---------------- */
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
        recipe.setCreateDate(LocalDateTime.now());

        // 업로더
        SiteUser author = resolveCurrentAuthor(authorFromController);
        recipe.setAuthor(author);

        // 썸네일
        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        // 재료 rows
        replaceIngredients(recipe, ingredients);

        // 스텝
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

    /* ---------------- 수정(보존) ---------------- */
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
            List<MultipartFile> newStepImages,
            List<String> captionsForNewSteps,
            List<Long> removeStepIds
    ) throws IOException {
        Recipe recipe = getRecipe(recipeId);

        SiteUser current = resolveCurrentAuthor(null);
        if (recipe.getAuthor() == null || current == null ||
                !Objects.equals(recipe.getAuthor().getId(), current.getId())) {
            throw new SecurityException("본인만 수정할 수 있습니다.");
        }

        if (subject != null)             recipe.setSubject(subject);
        if (cookingTimeMinutes != null)  recipe.setCookingTimeMinutes(cookingTimeMinutes);
        if (description != null)         recipe.setDescription(description);
        if (tools != null)               recipe.setTools(tools);
        if (estimatedPrice != null)      recipe.setEstimatedPrice(estimatedPrice);

        if (thumbnail != null && !thumbnail.isEmpty()) {
            recipe.setThumbnail(thumbnail.getBytes());
        }

        if (ingredients != null) {
            replaceIngredients(recipe, ingredients);
        }

        if (removeStepIds != null && !removeStepIds.isEmpty()) {
            recipe.getStepImages().removeIf(s -> s.getId() != null && removeStepIds.contains(s.getId()));
            for (Long sid : removeStepIds) {
                recipeStepImageRepository.findById(sid).ifPresent(si -> {
                    if (si.getRecipe() != null && Objects.equals(si.getRecipe().getId(), recipe.getId())) {
                        recipeStepImageRepository.delete(si);
                    }
                });
            }
        }

        int nextIndex = recipe.getStepImages() == null ? 1 : recipe.getStepImages().size() + 1;
        if (newStepImages != null) {
            for (int i = 0; i < newStepImages.size(); i++) {
                MultipartFile f = newStepImages.get(i);
                if (f == null || f.isEmpty()) continue;
                RecipeStepImage step = new RecipeStepImage();
                step.setStepIndex(nextIndex++);
                step.setImage(f.getBytes());
                String cap = (captionsForNewSteps != null && captionsForNewSteps.size() > i)
                        ? captionsForNewSteps.get(i) : null;
                step.setCaption(cap);
                recipe.addStepImage(step);
            }
        }

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

    /* ---------------- 재료 교체 ---------------- */
    @Transactional
    public void replaceIngredients(Recipe recipe, List<RecipeIngredientDTO> items) {
        if (recipe.getIngredientRows() != null) recipe.getIngredientRows().clear();
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

    /* ---------------- 조회/삭제 ---------------- */
    public Page<Recipe> getList(int page) {
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Order.desc("createDate")));
        return this.recipeRepository.findAll(pageable);
    }

    public Recipe getRecipe(Long id) {
        return this.recipeRepository.findById(id)
                .orElseThrow(() -> new DataNotFoundException("recipe not found"));
    }

    public List<Recipe> findAll() {
        return this.recipeRepository.findAll();
    }

    public List<Recipe> findByIds(List<Long> recipeIds) {
        if (recipeIds == null || recipeIds.isEmpty()) return Collections.emptyList();
        return this.recipeRepository.findAllById(recipeIds);
    }

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

    /* ==========================================================
     *                 냉장고 기반 레시피 추천
     *  - 일치율(레시피 재료 중 냉장고가 가진 비율) 우선
     *  - 유통기한 임박 재료가 포함되면 가산점
     * ========================================================== */
    @Transactional
    public List<RecipeMatchDTO> recommendByFridge(int limit) {
        // 1) 내 냉장고 재료 로드
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) return List.of();
        List<Ingredient> my = ingredientRepository.findAllByOwnerOrderByIdDesc(me);
        if (my.isEmpty()) return List.of();

        // nameNorm 세트 & 각 재료의 가장 임박한 유통기한 정보
        Map<String, LocalDate> normToSoonestExpire = new HashMap<>();
        Set<String> fridgeNorms = new HashSet<>();
        for (Ingredient ing : my) {
            String raw = ing.getName() == null ? "" : ing.getName().trim();
            if (raw.isEmpty()) continue;
            String norm = IngredientNormalizer.normalizeOne(raw);
            if (norm == null || norm.isBlank()) norm = raw.toLowerCase();
            if (norm.isBlank()) continue;

            fridgeNorms.add(norm);

            LocalDate d = ing.getExpireDate();
            if (d != null) {
                normToSoonestExpire.merge(norm, d, (oldV, newV) ->
                        oldV.isBefore(newV) ? oldV : newV // 더 이른 날짜(임박)를 저장
                );
            }
        }
        if (fridgeNorms.isEmpty()) return List.of();

        // 2) 전체 레시피와 비교 (규모가 크면 향후 최적화)
        List<Recipe> recipes = recipeRepository.findAll();

        List<RecipeMatchDTO> out = new ArrayList<>();
        for (Recipe r : recipes) {
            List<RecipeIngredient> rows = r.getIngredientRows();
            if (rows == null || rows.isEmpty()) continue;

            // 레시피 유니크 재료 set (nameNorm 기준)
            LinkedHashMap<String, String> normToDisplay = new LinkedHashMap<>();
            for (RecipeIngredient ri : rows) {
                String norm = ri.getNameNorm();
                String disp = ri.getName();
                if (norm == null || norm.isBlank()) {
                    String raw = disp == null ? "" : disp.trim();
                    norm = IngredientNormalizer.normalizeOne(raw);
                    if (norm == null || norm.isBlank()) norm = raw.toLowerCase();
                }
                if (norm == null || norm.isBlank()) continue;
                normToDisplay.putIfAbsent(norm, disp == null ? norm : disp);
            }
            if (normToDisplay.isEmpty()) continue;

            // 매칭 계산
            Set<String> recipeNorms = normToDisplay.keySet();
            Set<String> matched = recipeNorms.stream()
                    .filter(fridgeNorms::contains)
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            int total = recipeNorms.size();
            int hit = matched.size();
            if (total == 0 || hit == 0) continue; // 일치 0이면 추천 제외 (원하면 포함 가능)

            int percent = (int) Math.round(100.0 * hit / total);

            // 임박일(최소 일수) 계산
            Integer soonestDays = null;
            LocalDate today = LocalDate.now();
            for (String m : matched) {
                LocalDate d = normToSoonestExpire.get(m);
                if (d == null) continue;
                int days = (int) ChronoUnit.DAYS.between(today, d); // 음수면 이미 지남
                soonestDays = (soonestDays == null) ? days : Math.min(soonestDays, days);
            }

            // 가중치 점수: 일치율 + 임박 가산(<=7일이면 +최대 20점 선형)
            double base = percent;
            double bonus = 0.0;
            if (soonestDays != null && soonestDays <= 7) {
                int remain = Math.max(soonestDays, 0); // 음수면 0일로 간주
                bonus = (7 - remain) / 7.0 * 20.0;     // 0~20
            }
            double score = base + bonus;

            // 썸네일 URL
            String thumb = (r.getThumbnail() != null && r.getThumbnail().length > 0)
                    ? ("/recipe/thumbnail/" + r.getId())
                    : null;

            // DTO 구성
            List<String> matchedNames = matched.stream().map(normToDisplay::get).toList();
            List<String> missingNames = recipeNorms.stream()
                    .filter(n -> !matched.contains(n))
                    .map(normToDisplay::get)
                    .toList();

            RecipeMatchDTO dto = new RecipeMatchDTO(
                    r.getId(),
                    r.getSubject(),
                    r.getCookingTimeMinutes(),
                    r.getEstimatedPrice(),
                    thumb,
                    total,
                    hit,
                    percent,
                    soonestDays,
                    matchedNames,
                    missingNames
            );
            // 점수는 정렬에서만 사용 -> Map에 임시로 보관 or comparator에서 다시 계산
            // 여기선 리스트에 넣고 나중에 comparator에서 동일 로직으로 비교
            out.add(dto);
        }

        // 정렬: 1) 일치율 내림차순 2) 임박일 오름차순(null last) 3) 소요시간 오름차순 4) 최신순(id desc)
        out.sort((a, b) -> {
            int c1 = Integer.compare(b.getMatchPercent(), a.getMatchPercent());
            if (c1 != 0) return c1;
            // 임박일: null은 뒤로
            Integer da = a.getSoonestExpiryDays();
            Integer db = b.getSoonestExpiryDays();
            if (da == null && db != null) return 1;
            if (da != null && db == null) return -1;
            if (da != null && db != null) {
                int c2 = Integer.compare(da, db);
                if (c2 != 0) return c2;
            }
            Integer ta = a.getCookingTimeMinutes();
            Integer tb = b.getCookingTimeMinutes();
            if (ta != null && tb != null) {
                int c3 = Integer.compare(ta, tb);
                if (c3 != 0) return c3;
            }
            return Long.compare(b.getId(), a.getId());
        });

        if (limit > 0 && out.size() > limit) {
            return out.subList(0, limit);
        }
        return out;
    }
}