package com.example.app.controller;

import com.example.app.service.ProductImageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/products/images")
public class ProductImageController {
    private final ProductImageService imageService;
    public ProductImageController(ProductImageService imageService) { this.imageService = imageService; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> upload(@RequestPart("file") MultipartFile file) throws IOException {
        return Map.of("imageUrl", imageService.save(file));
    }
}
