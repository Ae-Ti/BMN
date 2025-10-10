// src/main/java/com/example/BMN/Recipe/RecipeController.java
package com.example.BMN.Recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/recipe")
@RequiredArgsConstructor
@Controller
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeStepImageRepository recipeStepImageRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /* ===================== View pages (optional) ===================== */

    @GetMapping("/list")
    public String list(Model model, @RequestParam(value = "page", defaultValue = "0") int page) {
        model.addAttribute("paging", this.recipeService.getList(page));
        return "test";
    }

    @GetMapping("/detail/{id}")
    public String detail(Model model, @PathVariable("id") Long id) {
        model.addAttribute("recipe", this.recipeService.getRecipe(id));
        return "recipe_detail";
    }

    /* ===================== JSON: 단건 조회 ===================== */

    @GetMapping(value = "/api/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<RecipeDTO> getRecipeJson(@PathVariable("id") Long id) {
        return ResponseEntity.ok(new RecipeDTO(this.recipeService.getRecipe(id)));
    }

    /* ===================== JSON: 목록(페이지/배열 겸용) ===================== */

    /**
     * 목록 데이터:
     * - page/size 중 하나라도 오면 Page 반환(목록 화면)
     * - 아무 파라미터 없으면 베스트 8개 배열 반환(메인 화면 하위호환)
     * sort: latest|views|rating|oldest|favorites (favorites는 최신순 대체)
     */
    @GetMapping(value = "/data", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<?> listData(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false, defaultValue = "views") String sort
    ) {
        // 파라미터 없으면: 메인페이지 호환 - 베스트 8개 배열
        if (page == null && size == null) {
            Page<Recipe> p = recipeService.listSorted(0, 8, "views");
            List<RecipeDTO> list = p.getContent().stream().map(RecipeDTO::new).collect(Collectors.toList());
            return ResponseEntity.ok(list);
        }

        // 페이지 요청: Page 반환
        int pg = page == null ? 0 : Math.max(0, page);
        int sz = size == null ? 12 : Math.max(1, size);
        Page<Recipe> pageData = recipeService.listSorted(pg, sz, sort);
        Page<RecipeDTO> dtoPage = pageData.map(RecipeDTO::new);
        return ResponseEntity.ok(dtoPage);
    }

    /* ===================== 생성 ===================== */

    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> create(
            HttpServletRequest request,
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestParam(value = "captions", required = false) List<String> captions
    ) throws Exception {

        if (captions == null) captions = List.of();

        String subject             = extractStringPart(request, "subject");
        String description         = extractStringPart(request, "description");
        String tools               = extractStringPart(request, "tools");
        Integer cookingTimeMinutes = parseIntOrNull(extractStringPart(request, "cookingTimeMinutes"));
        Integer estimatedPrice     = parseIntOrNull(extractStringPart(request, "estimatedPrice"));

        Long id = recipeService.createRecipe(
                subject,
                ingredients,
                cookingTimeMinutes,
                description,
                tools,
                estimatedPrice,
                thumbnail,
                stepImages,
                captions,
                null
        );
        return ResponseEntity.ok(id);
    }

    /* ===================== 수정 ===================== */

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> updateRecipe(
            @PathVariable("id") Long id,
            HttpServletRequest request,
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestParam(value = "captions", required = false) List<String> captions,
            @RequestParam(value = "removeStepIds", required = false) List<Long> removeStepIds
    ) throws Exception {

        if (captions == null) captions = List.of();

        String subject             = extractStringPart(request, "subject");
        String description         = extractStringPart(request, "description");
        String tools               = extractStringPart(request, "tools");
        Integer cookingTimeMinutes = parseIntOrNull(extractStringPart(request, "cookingTimeMinutes"));
        Integer estimatedPrice     = parseIntOrNull(extractStringPart(request, "estimatedPrice"));

        Long updatedId = recipeService.updateRecipeKeepStepsWithDelete(
                id,
                subject,
                ingredients,
                cookingTimeMinutes,
                description,
                tools,
                estimatedPrice,
                thumbnail,
                stepImages,
                captions,
                removeStepIds
        );
        return ResponseEntity.ok(updatedId);
    }

    /* ===================== 삭제 ===================== */

    @DeleteMapping("/{id}/delete")
    @ResponseBody
    public ResponseEntity<Void> deleteRecipe(@PathVariable("id") Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.noContent().build();
    }

    /* ===================== 미디어 ===================== */

    @GetMapping("/thumbnail/{id}")
    @ResponseBody
    public ResponseEntity<byte[]> getThumbnail(@PathVariable Long id) {
        byte[] imageBytes = this.recipeService.getRecipe(id).getThumbnail();
        if (imageBytes == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(imageBytes);
    }

    @GetMapping(value = "/steps/{stepId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> getStepImage(@PathVariable("stepId") Long stepId) {
        var step = recipeStepImageRepository.findById(stepId).orElse(null);
        if (step == null || step.getImage() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(step.getImage());
    }

    /* ===================== 조회수 ===================== */

    // 상세 진입 시 호출하여 조회수 +1
    @PostMapping("/api/{id}/view")
    @ResponseBody
    public ResponseEntity<Void> increaseView(@PathVariable("id") Long id) {
        recipeService.increaseViewCount(id);
        return ResponseEntity.noContent().build();
    }

    /* ===================== 즐겨찾기 ===================== */

    // 현재 로그인 사용자의 즐겨찾기 상태 & 총 개수
    @GetMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> favoriteStatus(@PathVariable("id") Long id) {
        boolean favorited = recipeService.isFavorited(id);
        int count = recipeService.getFavoriteCount(id);
        return ResponseEntity.ok(new FavoriteStatus(favorited, count));
    }

    // 즐겨찾기 추가
    @PostMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> addFavorite(@PathVariable("id") Long id) {
        var r = recipeService.addFavorite(id);
        return ResponseEntity.ok(new FavoriteStatus(r.isFavorited(), r.getFavoriteCount()));
    }

    // 즐겨찾기 취소
    @DeleteMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> removeFavorite(@PathVariable("id") Long id) {
        var r = recipeService.removeFavorite(id);
        return ResponseEntity.ok(new FavoriteStatus(r.isFavorited(), r.getFavoriteCount()));
    }

    // 컨트롤러 내부 DTO
    public record FavoriteStatus(boolean favorited, int favoriteCount) {}

    /* ===================== 내 레시피 / 내 즐겨찾기 (마이페이지/메인) ===================== */

    // 내가 작성한 레시피(배열) — MyPage에서 사용
    @GetMapping(value = "/api/me/recipes", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<RecipeDTO>> myRecipes() {
        // 페이지가 필요하면 service.listMyRecipes(page,size)로 바꿔도 됨
        // 여기서는 간단히 최신 100개 정도만 배열로 반환
        Page<Recipe> p = recipeService.listMyRecipes(0, 100);
        List<RecipeDTO> list = p.getContent().stream().map(RecipeDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // 내가 즐겨찾기한 레시피(배열) — MyPage/메인에서 사용
    @GetMapping(value = "/api/me/favorites", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<RecipeDTO>> myFavorites() {
        Page<Recipe> p = recipeService.listMyFavoriteRecipes(0, 100);
        List<RecipeDTO> list = p.getContent().stream().map(RecipeDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // (하위호환) 메인에서 쓰던 엔드포인트: /favorite/data/{userName}
    // 현재 로그인 사용자의 즐겨찾기를 반환(경로의 userName은 무시)
    @GetMapping(value = "/favorite/data/{userName}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<RecipeDTO>> favoritesCompat(@PathVariable("userName") String userName) {
        Page<Recipe> p = recipeService.listMyFavoriteRecipes(0, 100);
        List<RecipeDTO> list = p.getContent().stream().map(RecipeDTO::new).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /* ===================== Helpers ===================== */

    private String extractStringPart(HttpServletRequest request, String name) throws Exception {
        Part p = null;
        try { p = request.getPart(name); } catch (Exception ignored) {}
        if (p == null) return null;
        try (InputStream is = p.getInputStream()) {
            byte[] bytes = is.readAllBytes();
            if (bytes.length == 0) return null;
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    private Integer parseIntOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty() || "null".equalsIgnoreCase(t) || "undefined".equalsIgnoreCase(t)) return null;
        try { return Integer.valueOf(t); } catch (NumberFormatException e) { return null; }
    }
}