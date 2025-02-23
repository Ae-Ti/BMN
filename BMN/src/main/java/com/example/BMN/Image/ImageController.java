package com.example.BMN.Image;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;

@Controller
@RequestMapping("/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }


    // 이미지 ID로 이미지 가져오기
    @GetMapping("/{id}")
    public void getImage(@PathVariable("id") Long id, Model model) {//String에서 void
        byte[] imageData = imageService.getImage(id);
        if (imageData != null) {
            String base64Image = Base64.getEncoder().encodeToString(imageData);
            model.addAttribute("image", "data:image/jpeg;base64," + base64Image); // Base64 인코딩하여 전달
        } else {
            model.addAttribute("error", "Image not found");
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            // 이미지 파일을 서비스에 저장
            Image savedImage = imageService.saveImage(file);
            return ResponseEntity.status(HttpStatus.OK)
                    .body("Image uploaded successfully! ID: " + savedImage.getId());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to upload image");
        }
    }

}
