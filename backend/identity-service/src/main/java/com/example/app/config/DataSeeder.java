package com.example.app.config;

import com.example.app.entity.User;
import com.example.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .firstName("System")
                    .lastName("Admin")
                    .email("admin@freshvend.com")
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            log.info("Initialized default ADMIN user: admin / admin123");
        }

        if (!userRepository.existsByUsername("operator")) {
            User operator = User.builder()
                    .username("operator")
                    .password(passwordEncoder.encode("operator123"))
                    .firstName("Field")
                    .lastName("Operator")
                    .email("operator@freshvend.com")
                    .role("OPERATOR")
                    .build();
            userRepository.save(operator);
            log.info("Initialized default OPERATOR user: operator / operator123");
        }
    }
}
