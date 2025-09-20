package com.example.BMN.Recipe;

import com.example.BMN.User.SiteUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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
    public String list(Model model, @RequestParam(value="page", defaultValue="0") int page) {
        Page<Recipe> paging = this.recipeService.getList(page);
        model.addAttribute("paging", paging);
        return "test";
    }

    @GetMapping("/detail/{id}")
    public String detail(Model model, @PathVariable("id") Long id) {
        Recipe recipe = this.recipeService.getRecipe(id);
        model.addAttribute("recipe", recipe);
        return "recipe_detail";
    }

    /* ===================== JSON APIs ===================== */

    @GetMapping(value = "/api/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<RecipeDTO> getRecipeJson(@PathVariable("id") Long id) {
        Recipe recipe = this.recipeService.getRecipe(id);
        return ResponseEntity.ok(new RecipeDTO(recipe));
    }

    /**
     * 레시피 생성 (multipart/form-data)
     * - text 필드: subject, cookingTimeMinutes, description, tools, estimatedPrice, content  → request 파트에서 직접 추출
     * - ingredients: JSON 배열 → @RequestPart 로 List<RecipeIngredientDTO> 바인딩
     * - thumbnail, stepImages[], captions[]: @RequestPart 로 바인딩
     * 작성자는 서비스에서 SecurityContext로 해석함.
     */
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> create(
            HttpServletRequest request,
            @RequestPart("ingredients") List<RecipeIngredientDTO> ingredients,
            @RequestPart(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestPart(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestPart(value = "captions", required = false) List<String> captions
    ) throws Exception {

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
                null  // authorFromController: 서비스가 SecurityContext로 해석
        );
        return ResponseEntity.ok(id);
    }

    /* ===================== Media endpoints ===================== */

    @GetMapping("/thumbnail/{id}")
    @ResponseBody
    public ResponseEntity<byte[]> getThumbnail(@PathVariable Long id) {
        Recipe recipe = this.recipeService.getRecipe(id);
        byte[] imageBytes = recipe.getThumbnail();
        if (imageBytes == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(imageBytes);
    }

    @GetMapping(value = "/steps/{stepId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> getStepImage(@PathVariable("stepId") Long stepId) {
        var step = recipeStepImageRepository.findById(stepId).orElse(null);
        if (step == null || step.getImage() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(step.getImage());
    }

    /* ===================== Meta update / delete ===================== */

    @PatchMapping("/{id}")
    @ResponseBody
    public ResponseEntity<Long> patchRecipeMeta(@PathVariable("id") Long id,
                                                @RequestBody @Valid RecipeUpdateRequest req) {
        Recipe updated = recipeService.updateRecipeMeta(id, req);
        return ResponseEntity.ok(updated.getId());
    }

    @DeleteMapping("/{id}/delete")
    @ResponseBody
    public ResponseEntity<Void> deleteRecipe(@PathVariable("id") Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.noContent().build();
    }

    /* ===================== Step image CRUD (multipart) ===================== */

    @PostMapping(value = "/{id}/steps", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> addStep(@PathVariable Long id,
                                        @RequestParam(value="stepIndex", required=false) Integer stepIndex,
                                        @RequestParam(value="caption", required=false) String caption,
                                        @RequestParam(value="image", required=false) MultipartFile image) throws Exception {
        RecipeStepImage saved = recipeService.addStepImage(id, stepIndex, caption, image);
        return ResponseEntity.ok(saved.getId());
    }

    @PutMapping(value = "/{id}/steps/{stepId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Long> updateStep(@PathVariable Long id,
                                           @PathVariable Long stepId,
                                           @RequestParam(value="stepIndex", required=false) Integer stepIndex,
                                           @RequestParam(value="caption", required=false) String caption,
                                           @RequestParam(value="image", required=false) MultipartFile image,
                                           @RequestParam(value="removeImage", required=false, defaultValue="false") boolean removeImage) throws Exception {
        RecipeStepImage saved = recipeService.updateStepImage(id, stepId, stepIndex, caption, image, removeImage);
        return ResponseEntity.ok(saved.getId());
    }

    @DeleteMapping("/{id}/steps/{stepId}")
    @ResponseBody
    public ResponseEntity<Void> deleteStep(@PathVariable("id") Long id,
                                           @PathVariable("stepId") Long stepId) {
        recipeService.deleteStepImage(id, stepId);
        return ResponseEntity.noContent().build();
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