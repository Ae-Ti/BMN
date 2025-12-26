package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
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

@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/recipe")
@RequiredArgsConstructor
@Controller
public class RecipeController {

    private final RecipeService recipeService;
    private final RecipeStepImageRepository recipeStepImageRepository;
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /* ===================== View pages ===================== */

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

    /* ===================== JSON API (단건) ===================== */

    @GetMapping(value = "/api/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<RecipeDTO> getRecipeJson(@PathVariable("id") Long id) {
        return ResponseEntity.ok(new RecipeDTO(this.recipeService.getRecipe(id)));
    }

    /* ===================== 생성 ===================== */

    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> create(
            HttpServletRequest request,
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestParam(value = "captions", required = false) List<String> captions,
            @RequestParam(value = "stepTypes", required = false) List<String> stepTypes,
            @RequestParam(value = "stepVideoUrls", required = false) List<String> stepVideoUrls
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
                stepTypes,
                stepVideoUrls,
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
            @RequestParam(value = "stepTypes", required = false) List<String> stepTypes,
            @RequestParam(value = "stepVideoUrls", required = false) List<String> stepVideoUrls,
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
                stepTypes,
                stepVideoUrls,
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

    /* ===================== 조회수 & 즐겨찾기 ===================== */

    @PostMapping("/api/{id}/view")
    @ResponseBody
    public ResponseEntity<Void> increaseView(@PathVariable("id") Long id) {
        recipeService.increaseViewCount(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> favoriteStatus(@PathVariable("id") Long id) {
        boolean favorited = recipeService.isFavorited(id);
        int count = recipeService.getFavoriteCount(id);
        return ResponseEntity.ok(new FavoriteStatus(favorited, count));
    }

    @PostMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> addFavorite(@PathVariable("id") Long id) {
        var r = recipeService.addFavorite(id);
        return ResponseEntity.ok(new FavoriteStatus(r.isFavorited(), r.getFavoriteCount()));
    }

    @DeleteMapping("/api/{id}/favorite")
    @ResponseBody
    public ResponseEntity<FavoriteStatus> removeFavorite(@PathVariable("id") Long id) {
        var r = recipeService.removeFavorite(id);
        return ResponseEntity.ok(new FavoriteStatus(r.isFavorited(), r.getFavoriteCount()));
    }

    public record FavoriteStatus(boolean favorited, int favoriteCount) {}

    /* ===================== 사용자별 레시피/즐겨찾기 조회 ===================== */

    @GetMapping("/api/user/{username}/recipes")
    @ResponseBody
    public ResponseEntity<List<RecipeDTO>> recipesByUser(@PathVariable String username) {
        SiteUser user = userRepository.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        var list = recipeService.findAll().stream()
                .filter(r -> r.getAuthor() != null && user.getId().equals(r.getAuthor().getId()))
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/api/user/{username}/favorites")
    @ResponseBody
    public ResponseEntity<List<RecipeDTO>> favoritesByUser(@PathVariable String username) {
        SiteUser user = userRepository.findByUserName(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        var list = favoriteRepository.findWithRecipeByUserOrderByIdDesc(user).stream()
                .map(Favorite::getRecipe)
                .map(RecipeDTO::new)
                .toList();
        return ResponseEntity.ok(list);
    }

    /* ===================== 트렌딩 정렬 (통합 버전) ===================== */

    @GetMapping("/data")
    @ResponseBody
    public ResponseEntity<?> trendingUnified(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        int p = (page != null) ? page : 0;
        int s = (size != null) ? size : 8;  // 기본값 8개

        Page<Recipe> paged = recipeService.listTrending(p, s);
        List<RecipeDTO> content = paged.getContent().stream()
                .map(RecipeDTO::new)
                .toList();

        // ✅ page 파라미터가 없으면: 상위 리스트 반환 (메인용)
        if (page == null) {
            return ResponseEntity.ok(content);
        }

        // ✅ page 파라미터가 있으면: PageEnvelope 형태 반환 (목록용)
        PageEnvelope<RecipeDTO> result = new PageEnvelope<>(
                content,
                paged.getNumber(),
                paged.getSize(),
                paged.getTotalElements(),
                paged.isLast()
        );
        return ResponseEntity.ok(result);
    }

    /* ===================== 검색 (서버 사이드) ===================== */
    @GetMapping("/api/search")
    @ResponseBody
    public ResponseEntity<?> searchApi(
            @RequestParam(name = "q") String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        int p = (page != null) ? page : 0;
        int s = (size != null) ? size : 12;
        if (q == null || q.trim().isEmpty()) {
            // 빈 쿼리는 트렌딩으로 위임
            Page<Recipe> paged = recipeService.listTrending(p, s);
            List<RecipeDTO> content = paged.getContent().stream().map(RecipeDTO::new).toList();
            PageEnvelope<RecipeDTO> result = new PageEnvelope<>(content, paged.getNumber(), paged.getSize(), paged.getTotalElements(), paged.isLast());
            return ResponseEntity.ok(result);
        }

        Page<Recipe> paged = recipeService.searchByText(q, p, s);
        List<RecipeDTO> content = paged.getContent().stream().map(RecipeDTO::new).toList();
        PageEnvelope<RecipeDTO> result = new PageEnvelope<>(content, paged.getNumber(), paged.getSize(), paged.getTotalElements(), paged.isLast());
        return ResponseEntity.ok(result);
    }

    // 공통 PageEnvelope DTO
    public record PageEnvelope<T>(
            List<T> content,
            int page,
            int size,
            long total,
            boolean last
    ) {}

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