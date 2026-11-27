package com.example.app.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserResponse {
    String id;
    String username;
    String firstName;
    String lastName;
    String fullName;
    String email;
    String role;

    public UserResponse(String id, String username, String firstName, String lastName, String email) {
        this(id, username, firstName, lastName, buildFullName(firstName, lastName, username), email, "OPERATOR");
    }

    public static String buildFullName(String firstName, String lastName, String fallbackUsername) {
        String f = firstName != null ? firstName.trim() : "";
        String l = lastName != null ? lastName.trim() : "";
        String combined = (f + " " + l).trim();
        return combined.isEmpty() ? fallbackUsername : combined;
    }
}
