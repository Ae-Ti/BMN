package com.example.BMN.Image;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@Service
public class ImageService {
    private final ImageRepository imageRepository;

    public ImageService(ImageRepository imageRepository) {

        this.imageRepository = imageRepository;
    }

    // 이미지 저장
    public Image saveImage(MultipartFile file) throws IOException {
        Image image = Image.builder()
                .filename(file.getOriginalFilename())
                .contentType(file.getContentType())
                .data(file.getBytes())
                .build();
        return imageRepository.save(image);
    }

    // 이미지 가져오기
   public Optional<Image> getImage(Long id){
        return imageRepository.findById(id);
   }
}
