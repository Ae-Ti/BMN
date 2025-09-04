package com.example.BMN.Image;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.Optional;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageDTO> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        Image image = imageService.saveImage(file);
        return ResponseEntity.ok(new ImageDTO(image.getId(), image.getFilename()));
    }

    public ResponseEntity<?> downloadImage(@PathVariable Long id){
        return imageService.getImage(id)
                .<ResponseEntity<?>>map(image -> {
                    ByteArrayResource resource = new ByteArrayResource(image.getData());

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.parseMediaType(image.getContentType()));
                    headers.setContentDisposition(ContentDisposition.attachment()
                            .filename(image.getFilename())
                            .build());

                    return ResponseEntity.ok()
                            .headers(headers)
                            .contentLength(image.getData().length)
                            .body(resource);
                })
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.NOT_FOUND)
                        .body("Image not found"));
    }
}
