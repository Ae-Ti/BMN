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
        byte[] imageData = file.getBytes();
        Image image = new Image();
        image.setName(file.getOriginalFilename());
        image.setImageData(imageData);
        return imageRepository.save(image);
    }

    // 이미지 가져오기
    public byte[] getImage(Long id) {
        Optional<Image> image = imageRepository.findById(id);
        return image.map(Image::getImageData).orElse(null);
    }
}
