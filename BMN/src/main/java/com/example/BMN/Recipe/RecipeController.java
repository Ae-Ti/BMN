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
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/recipe")
@RequiredArgsConstructor
@Controller
public class RecipeController {

    private final RecipeService recipeService;
    private final UserService userService;

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
    @PostMapping(value = "/create", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> recipeCreate(
            @ModelAttribute @Valid RecipeForm form,
            BindingResult bindingResult,
            @AuthenticationPrincipal UserDetails userDetails
    ) throws IOException {
        if (bindingResult.hasErrors()) {
            var errors = bindingResult.getFieldErrors().stream()
                    .map(e -> e.getField() + ": " + e.getDefaultMessage())
                    .toList();
            return ResponseEntity.badRequest().body(Map.of("message", "유효성 오류", "errors", errors));
        }
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "로그인이 필요합니다."));
        }
        var saved = recipeService.createRecipe(form, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("id", saved.getId()));
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


}
