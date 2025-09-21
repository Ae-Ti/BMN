package com.example.BMN.Recipe;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import lombok.RequiredArgsConstructor;
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

    /* ===================== JSON API ===================== */

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
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,         // Blob(application/json)
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestParam(value = "captions", required = false) List<String> captions  // text/plain 다중 필드
    ) throws Exception {

        if (captions == null) captions = List.of(); // 안정 처리

        String subject             = extractStringPart(request, "subject");
        String description         = extractStringPart(request, "description");
        String tools               = extractStringPart(request, "tools");
        String content             = extractStringPart(request, "content");
        Integer cookingTimeMinutes = parseIntOrNull(extractStringPart(request, "cookingTimeMinutes"));
        Integer estimatedPrice     = parseIntOrNull(extractStringPart(request, "estimatedPrice"));

        Long id = recipeService.createRecipe(
                subject,
                ingredients,
                cookingTimeMinutes,
                description,
                tools,
                estimatedPrice,
                content,
                thumbnail,
                stepImages,
                captions,
                null  // authorFromController (서비스에서 SecurityContext로 해석)
        );
        return ResponseEntity.ok(id);
    }

    /* ===================== 수정 (기존 유지 + 선택 삭제 + 신규 추가) ===================== */

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> updateRecipe(
            @PathVariable("id") Long id,
            HttpServletRequest request,
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,         // Blob(application/json)
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages, // 새로 추가할 스텝들
            @RequestParam(value = "captions", required = false) List<String> captions,           // 새 스텝 캡션
            @RequestParam(value = "removeStepIds", required = false) List<Long> removeStepIds    // 삭제할 기존 step id
    ) throws Exception {

        if (captions == null) captions = List.of(); // 안정 처리

        String subject             = extractStringPart(request, "subject");
        String description         = extractStringPart(request, "description");
        String tools               = extractStringPart(request, "tools");
        String content             = extractStringPart(request, "content");
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
                content,
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
        if (t.isEmpty()) return null;
        try { return Integer.valueOf(t); } catch (NumberFormatException e) { return null; }
    }
}