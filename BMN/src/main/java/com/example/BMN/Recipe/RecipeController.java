package com.example.BMN.Recipe;

import com.example.BMN.Review.ReviewForm;
import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserService;
import jakarta.persistence.Lob;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/recipe")
@RequiredArgsConstructor
@Controller
public class RecipeController {

    private final RecipeService recipeService;
    private final UserService userService;
    private final RecipeStepImageRepository recipeStepImageRepository;

    @GetMapping("/list")
    public String list(Model model, @RequestParam(value="page", defaultValue="0") int page){
        Page<Recipe> paging = this.recipeService.getList(page);
        model.addAttribute("paging", paging);
        return "test";
    }


    @GetMapping(value="/detail/{id}")
    public String detail(Model model, @PathVariable("id") Long id, ReviewForm reviewForm){
        Recipe recipe = this.recipeService.getRecipe(id);
        model.addAttribute("recipe", recipe);
        return "recipe_detail";
    }

    @GetMapping("/create")
    public String recipeCreate(RecipeForm recipeform){
        return "recipe_form";
    }

    /*@PostMapping("/create")
    public String recipeCreate(@Valid RecipeForm recipeForm, BindingResult bindingResult){
        if(bindingResult.hasErrors()){
            return "recipe_form";
        }
        this.recipeService.create(recipeForm.getSubject(), recipeForm.getContent());
        return "redirect:/recipe/list";//레시피 저장 후 레시피 목록으로 이동
    }
*/
    @PostMapping(
            value = "/create",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Long> create(
            @RequestParam String subject,
            @RequestParam(required = false) String ingredients,
            @RequestParam(required = false) Integer cookingTimeMinutes,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String tools,
            @RequestParam(required = false) Integer estimatedPrice,
            @RequestParam(required = false) String content,

            // 여기: @RequestParam 으로 변경
            @RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail,

            @RequestParam(value = "stepImages", required = false) List<MultipartFile> stepImages,
            @RequestParam(value = "stepImages[]", required = false) List<MultipartFile> stepImagesAlt,

            @RequestParam(value = "captions", required = false) List<String> captions,
            @RequestParam(value = "captions[]", required = false) List<String> captionsAlt,
            // 시큐리티를 쓰고 있으면 현재 사용자 주입(없으면 null)
            @AuthenticationPrincipal SiteUser author
    ) throws IOException {

        // 어떤 키로 왔든 합치기
        List<MultipartFile> steps = (stepImages != null && !stepImages.isEmpty()) ? stepImages : stepImagesAlt;
        List<String> caps = (captions != null && !captions.isEmpty()) ? captions : captionsAlt;

        Long id = recipeService.createRecipe(
                subject, ingredients, cookingTimeMinutes, description, tools,
                estimatedPrice, content, thumbnail, steps, caps, author
        );
        return ResponseEntity.ok(id);
    }

    @GetMapping("/thumbnail/{id}")//썸네일 이미지 내려주기
    public ResponseEntity<byte[]> getThumbnail(@PathVariable Long id) {
        Recipe recipe = recipeService.getRecipe(id);
        byte[] imageBytes = recipe.getThumbnail();

        if (imageBytes == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG) // PNG면 IMAGE_PNG
                .body(imageBytes);
    }

    // === [OPTIONAL ADD] 단계 이미지 조회 ===
    @GetMapping(value = "/steps/{stepId}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getStepImage(@PathVariable("stepId") Long stepId) {
        var step = recipeStepImageRepository.findById(stepId)
                .orElse(null);
        if (step == null || step.getImage() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(step.getImage());
    }


    // 레시피 메타(제목/설명/도구/가격/추가설명) 부분 수정 (JSON)
    // null 필드는 변경하지 않음
    //나중에 경로 수정
    @PatchMapping("/{id}")
    public ResponseEntity<Long> patchRecipeMeta(@PathVariable("id") Long id,
                                                @RequestBody @Valid RecipeUpdateRequest req) {
        Recipe updated = recipeService.updateRecipeMeta(id, req);
        return ResponseEntity.ok(updated.getId());
    }

    // 레시피 삭제
    @DeleteMapping("/{id}/delete")
    public ResponseEntity<Void> deleteRecipe(@PathVariable("id") Long id) {
        recipeService.deleteRecipe(id);
        return ResponseEntity.noContent().build();
    }

    // 단계 이미지 추가
    @PostMapping(value = "/{id}/steps", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Long> addStep(@PathVariable Long id,
                                        @RequestParam(value="stepIndex", required=false) Integer stepIndex,
                                        @RequestParam(value="caption", required=false) String caption,
                                        @RequestParam(value="image", required=false) MultipartFile image) throws Exception {
        RecipeStepImage saved = recipeService.addStepImage(id, stepIndex, caption, image);
        return ResponseEntity.ok(saved.getId());
    }

    // 단계 이미지 수정
    @PutMapping(value = "/{id}/steps/{stepId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Long> updateStep(@PathVariable Long id,
                                           @PathVariable Long stepId,
                                           @RequestParam(value="stepIndex", required=false) Integer stepIndex,
                                           @RequestParam(value="caption", required=false) String caption,
                                           @RequestParam(value="image", required=false) MultipartFile image,
                                           @RequestParam(value="removeImage", required=false, defaultValue="false") boolean removeImage) throws Exception {
        RecipeStepImage saved = recipeService.updateStepImage(id, stepId, stepIndex, caption, image, removeImage);
        return ResponseEntity.ok(saved.getId());
    }


    // 단계 이미지 삭제
    @DeleteMapping("/{id}/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable("id") Long id,
                                           @PathVariable("stepId") Long stepId) {
        recipeService.deleteStepImage(id, stepId);
        return ResponseEntity.noContent().build();
    }

}
