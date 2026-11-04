package com.example.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlertResolveRequest(
        @Size(max = 150) String resolvedBy,
        @NotBlank @Size(max = 2000) String resolutionNote
) {
}
