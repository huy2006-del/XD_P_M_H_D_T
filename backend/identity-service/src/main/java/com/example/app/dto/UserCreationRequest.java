package com.example.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCreationRequest {
    @Size(min = 3, message = "Username must be at least 3 characters")
    String username;

    @Size(min = 8, message = "Password must be at least 8 characters")
    String password;

    String firstName;
    String lastName;

    @Email(message = "Email invalid")
    String email;

    String role;

    public UserCreationRequest(String username, String password, String firstName, String lastName, String email) {
        this(username, password, firstName, lastName, email, "OPERATOR");
    }

    public UserCreationRequest(String username, String password, String firstName, String lastName, String email, String role) {
        this.username = username;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.role = role;
    }
}
