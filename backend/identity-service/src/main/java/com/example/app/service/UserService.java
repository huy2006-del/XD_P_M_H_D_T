package com.example.app.service;

import com.example.app.dto.UserCreationRequest;
import com.example.app.dto.UserResponse;
import com.example.app.entity.User;
import com.example.app.repository.UserRepository;
import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Service
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserService {
    final UserRepository userRepository;
    final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("User already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole() != null && !request.getRole().isBlank()
                ? request.getRole().trim().toUpperCase()
                : "OPERATOR");

        User savedUser = userRepository.save(user);

        return toUserResponse(savedUser);
    }

    public List<UserResponse> getUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserResponse)
                .toList();
    }

    private UserResponse toUserResponse(User user) {
        String role = user.getRole() != null && !user.getRole().isBlank() ? user.getRole() : "OPERATOR";
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(UserResponse.buildFullName(user.getFirstName(), user.getLastName(), user.getUsername()))
                .email(user.getEmail())
                .role(role)
                .build();
    }
}
