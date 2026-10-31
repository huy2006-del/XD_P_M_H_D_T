package com.example.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class ProductImageService {
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private final Path uploadDir;
    public ProductImageService(@Value("${app.upload-dir:uploads/products}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }
    public String save(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Please choose an image file");
        if (file.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("Image size must not exceed 5 MB");
        if (!ALLOWED_TYPES.contains(file.getContentType())) throw new IllegalArgumentException("Only JPEG, PNG, WEBP or GIF images are supported");
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null || !Set.of("jpg", "jpeg", "png", "webp", "gif").contains(ext.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Unsupported image extension");
        }
        Files.createDirectories(uploadDir);
        String filename = UUID.randomUUID() + "." + ext.toLowerCase(Locale.ROOT);
        Path destination = uploadDir.resolve(filename).normalize();
        if (!destination.startsWith(uploadDir)) throw new IllegalArgumentException("Invalid filename");
        file.transferTo(destination);
        return "/uploads/products/" + filename;
    }
}
