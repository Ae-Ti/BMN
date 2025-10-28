// src/main/java/com/example/BMN/Recipe/RecipeService.java
package com.example.BMN.Recipe;

import com.example.BMN.DataNotFoundException;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import com.example.BMN.fridge.Ingredient;
import com.example.BMN.fridge.IngredientRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
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

    // 냉장고 재료 조회
    private final IngredientRepository ingredientRepository;

    // 즐겨찾기(조인) 리포지토리
    private final FavoriteRepository favoriteRepository;

    /* ---------------- 공통 유틸 ---------------- */

    private SiteUser resolveCurrentAuthor(SiteUser fromController) {
        if (fromController != null) return fromController;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        String username = auth.getName();
        if (username == null || username.isBlank()) return null;
        return userRepository.findByUserName(username).orElse(null);
    }

    public SiteUser findUserByUsername(String username) {
        if (username == null || username.isBlank()) return null;
        return userRepository.findByUserName(username).orElse(null);
    }

    public SiteUser currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        String username = auth.getName();
        return findUserByUsername(username);
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

        // 초기 카운터들
        if (recipe.getAverageRating() == null) recipe.setAverageRating(0.0);
        if (recipe.getRatingCount() == null) recipe.setRatingCount(0);
        if (recipe.getViewCount() == null) recipe.setViewCount(0L);
        if (recipe.getFavoriteCount() == null) recipe.setFavoriteCount(0);

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

    /* ---------------- 기본 조회/삭제 ---------------- */
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

    /* ---------------- 조회수/즐겨찾기 ---------------- */

    // 조회수 +1
    @Transactional
    public void increaseViewCount(Long recipeId) {
        Recipe r = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new IllegalArgumentException("레시피가 존재하지 않습니다."));
        Long vc = (r.getViewCount() == null) ? 0L : r.getViewCount();
        r.setViewCount(vc + 1);
    }

    @Data @AllArgsConstructor
    public static class FavoriteResult {
        private boolean favorited;   // 현재 로그인 사용자의 상태
        private int favoriteCount;   // 총 즐겨찾기 개수
    }

    /** 현재 로그인 사용자가 즐겨찾기 했는지 */
    @Transactional
    public boolean isFavorited(Long recipeId) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) return false;
        Recipe r = getRecipe(recipeId);
        return favoriteRepository.existsByUserAndRecipe(me, r);
    }

    /** 레시피 즐겨찾기 총 개수 */
    @Transactional
    public int getFavoriteCount(Long recipeId) {
        Recipe r = getRecipe(recipeId);
        return favoriteRepository.countByRecipe(r);
    }

    /** 즐겨찾기 추가: 조인 행 INSERT + 카운트 원자적 +1 */
    @Transactional
    public FavoriteResult addFavorite(Long recipeId) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) throw new SecurityException("로그인이 필요합니다.");
        Recipe r = getRecipe(recipeId);

        if (!favoriteRepository.existsByUserAndRecipe(me, r)) {
            favoriteRepository.save(new Favorite(me, r));
            // 원자적 카운트 +1 (RecipeRepository에 @Modifying 쿼리 필요)
            recipeRepository.increaseFavoriteCount(r.getId());
        }
        int cnt = favoriteRepository.countByRecipe(r);
        return new FavoriteResult(true, cnt);
    }

    /** 즐겨찾기 해제: 조인 행 DELETE + 카운트 원자적 -1 (0 미만 방지) */
    @Transactional
    public FavoriteResult removeFavorite(Long recipeId) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) throw new SecurityException("로그인이 필요합니다.");
        Recipe r = getRecipe(recipeId);

        if (favoriteRepository.existsByUserAndRecipe(me, r)) {
            favoriteRepository.deleteByUserAndRecipe(me, r);
            // 원자적 카운트 -1
            recipeRepository.decreaseFavoriteCount(r.getId());
        }
        int cnt = favoriteRepository.countByRecipe(r);
        return new FavoriteResult(false, cnt);
    }

    /** (선택) 과거 데이터 보정용: 조인테이블 기준으로 컬럼을 재계산하여 저장 */
    @Transactional
    public void recalcFavoriteCount(Long recipeId) {
        Recipe r = getRecipe(recipeId);
        int cnt = favoriteRepository.countByRecipe(r);
        r.setFavoriteCount(cnt);
        // dirty checking 으로 업데이트
    }

    /* ---------------- 정렬/목록 ---------------- */

    /** 정렬된 목록(기존 옵션 유지) */
    @Transactional
    public Page<Recipe> listSorted(int page, int size, String sortKey) {
        if (size <= 0) size = 12;
        if (page < 0) page = 0;
        if (sortKey == null || sortKey.isBlank()) sortKey = "latest";

        Sort sort = switch (sortKey) {
            case "views"     -> Sort.by(Sort.Order.desc("viewCount"), Sort.Order.desc("id"));
            case "rating"    -> Sort.by(Sort.Order.desc("averageRating"),
                    Sort.Order.desc("ratingCount"),
                    Sort.Order.desc("id"));
            case "oldest"    -> Sort.by(Sort.Order.asc("createDate"));
            case "latest"    -> Sort.by(Sort.Order.desc("createDate"), Sort.Order.desc("id"));
            case "favorites" -> Sort.by(Sort.Order.desc("favoriteCount"), Sort.Order.desc("id"));
            default          -> Sort.by(Sort.Order.desc("createDate"), Sort.Order.desc("id"));
        };

        Pageable pageable = PageRequest.of(page, size, sort);
        return recipeRepository.findAll(pageable);
    }

    /** ✅ 트렌딩 정렬(중복 방지 안정 페이징) */
    @Transactional
    public Page<Recipe> listTrending(int page, int size) {
        int p = Math.max(0, page);
        int s = Math.max(1, size);

        // 1) DB에서 **안정 정렬**로 먼저 페이징 (중복 방지 핵심)
        Pageable pageable = PageRequest.of(p, s, Sort.by(
                Sort.Order.desc("favoriteCount"),
                Sort.Order.desc("viewCount"),
                Sort.Order.desc("averageRating"),
                Sort.Order.desc("ratingCount"),
                Sort.Order.desc("createDate"),
                Sort.Order.desc("id")
        ));

        Page<Recipe> basePage = recipeRepository.findAll(pageable);
        List<Recipe> baseList = basePage.getContent();
        if (baseList.isEmpty()) {
            return basePage; // 그대로 반환
        }

        // 2) 점수 계산용 데이터 (해당 페이지 범위에 대해서만)
        Map<Long, Long> favCounts = favoriteRepository.countByRecipeIds(
                baseList.stream().map(Recipe::getId).toList()
        );

        record Scored(Recipe r, double score) {}
        LocalDateTime now = LocalDateTime.now();

        // 3) 트렌딩 점수로 **페이지 내부** 미세 정렬 (전체 순서/페이징은 DB가 책임)
        List<Scored> scored = baseList.stream()
                .map(r -> {
                    long views = Optional.ofNullable(r.getViewCount()).orElse(0L);
                    double fav = favCounts.getOrDefault(r.getId(), 0L);
                    double rating = Optional.ofNullable(r.getAverageRating()).orElse(0.0);
                    long ratingCnt = Optional.ofNullable(r.getRatingCount()).orElse(0);
                    long ageDays = (r.getCreateDate() != null)
                            ? Math.max(0, Duration.between(r.getCreateDate(), now).toDays())
                            : 365;

                    double score = Math.log1p(views) * 1.0
                            + fav * 3.0
                            + rating * Math.log1p(ratingCnt) * 4.0
                            + Math.exp(-ageDays / 14.0) * 15.0;
                    return new Scored(r, score);
                })
                .sorted((a, b) -> {
                    int cmp = Double.compare(b.score, a.score);
                    return (cmp != 0) ? cmp : Long.compare(b.r.getId(), a.r.getId());
                })
                .toList(); // 페이지 내부 정렬만이므로 불변 OK

        // 4) PageImpl로 반환 (총 개수/페이지 정보는 DB 페이지와 동일)
        List<Recipe> pageContent = scored.stream().map(Scored::r).toList();
        return new PageImpl<>(pageContent, basePage.getPageable(), basePage.getTotalElements());
    }

    /** 검색 (간단한 텍스트 기반, 페이징) */
    @Transactional
    public Page<Recipe> searchByText(String q, int page, int size) {
        if (q == null) q = "";
        String lower = q.trim().toLowerCase();
        if (size <= 0) size = 12;
        if (page < 0) page = 0;

        Pageable pageable = PageRequest.of(page, size);
        Page<Recipe> basePage = recipeRepository.searchByText(lower, pageable);
        List<Recipe> baseList = basePage.getContent();
        if (baseList.isEmpty()) return basePage;

        // compute a lightweight similarity score combining text matches and simple signals
        Map<Long, Long> favCounts = favoriteRepository.countByRecipeIds(
                baseList.stream().map(Recipe::getId).toList()
        );

        record Scored(Recipe r, double score) {}
        List<Scored> scored = baseList.stream().map(r -> {
            double score = 0.0;
            try {
                String combined = ((r.getSubject() == null) ? "" : r.getSubject()) + "\n" +
                        ((r.getDescription() == null) ? "" : r.getDescription());
                String combinedLower = combined.toLowerCase();
                if (combinedLower.contains(lower)) score += 50.0;
                // extra weight for subject occurrences
                if (r.getSubject() != null && r.getSubject().toLowerCase().contains(lower)) score += 30.0;
            } catch (Exception ignored) {}

            // ingredient name matches
            try {
                if (r.getIngredientRows() != null) {
                    for (var ing : r.getIngredientRows()) {
                        if (ing == null || ing.getName() == null) continue;
                        if (ing.getName().toLowerCase().contains(lower)) score += 20.0;
                    }
                }
            } catch (Exception ignored) {}

            // trending signals
            long views = Optional.ofNullable(r.getViewCount()).orElse(0L);
            double fav = favCounts.getOrDefault(r.getId(), 0L);
            double rating = Optional.ofNullable(r.getAverageRating()).orElse(0.0);
            long ratingCnt = Optional.ofNullable(r.getRatingCount()).orElse(0);
            score += Math.log1p(views) * 0.3 + fav * 1.0 + rating * Math.log1p(ratingCnt) * 1.5;

            return new Scored(r, score);
        }).sorted((a, b) -> Double.compare(b.score, a.score)).toList();

        List<Recipe> pageContent = scored.stream().map(Scored::r).toList();
        return new PageImpl<>(pageContent, basePage.getPageable(), basePage.getTotalElements());
    }

    /** 내가 작성한 레시피 (페이지네이션) */
    @Transactional
    public Page<Recipe> listMyRecipes(int page, int size) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) return Page.empty();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size),
                Sort.by(Sort.Order.desc("createDate"), Sort.Order.desc("id")));
        return recipeRepository.findByAuthor(me, pageable);
    }

    /** 내가 즐겨찾기한 레시피 (페이지네이션) */
    @Transactional
    public Page<Recipe> listMyFavoriteRecipes(int page, int size) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) return Page.empty();

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size),
                Sort.by(Sort.Order.desc("id")));

        Page<Favorite> favPage = favoriteRepository.findByUser(me, pageable);
        List<Recipe> recipes = favPage.stream().map(Favorite::getRecipe).toList();

        return new PageImpl<>(recipes, pageable, favPage.getTotalElements());
    }

    /* ==========================================================
     *                 냉장고 기반 레시피 추천
     * ========================================================== */
    @Transactional
    public List<RecipeMatchDTO> recommendByFridge(int limit) {
        SiteUser me = resolveCurrentAuthor(null);
        if (me == null) return List.of();
        List<Ingredient> my = ingredientRepository.findAllByOwnerOrderByIdDesc(me);
        if (my.isEmpty()) return List.of();

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
                normToSoonestExpire.merge(norm, d, (oldV, newV) -> oldV.isBefore(newV) ? oldV : newV);
            }
        }
        if (fridgeNorms.isEmpty()) return List.of();

        List<Recipe> recipes = recipeRepository.findAll();

        List<RecipeMatchDTO> out = new ArrayList<>();
        for (Recipe r : recipes) {
            List<RecipeIngredient> rows = r.getIngredientRows();
            if (rows == null || rows.isEmpty()) continue;

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

            Set<String> recipeNorms = normToDisplay.keySet();
            Set<String> matched = recipeNorms.stream()
                    .filter(fridgeNorms::contains)
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            int total = recipeNorms.size();
            int hit = matched.size();
            if (total == 0 || hit == 0) continue;

            int percent = (int) Math.round(100.0 * hit / total);

            Integer soonestDays = null;
            LocalDate today = LocalDate.now();
            for (String m : matched) {
                LocalDate d = normToSoonestExpire.get(m);
                if (d == null) continue;
                int days = (int) ChronoUnit.DAYS.between(today, d);
                soonestDays = (soonestDays == null) ? days : Math.min(soonestDays, days);
            }

            String thumb = (r.getThumbnail() != null && r.getThumbnail().length > 0)
                    ? ("/recipe/thumbnail/" + r.getId())
                    : null;

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
            out.add(dto);
        }

        out.sort((a, b) -> {
            int c1 = Integer.compare(b.getMatchPercent(), a.getMatchPercent());
            if (c1 != 0) return c1;
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