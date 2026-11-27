package com.example.app.service;

import com.example.app.controller.AuthController;
import com.example.app.controller.UserController;
import com.example.app.dto.ApiResponse;
import com.example.app.dto.LoginRequest;
import com.example.app.dto.LoginResponse;
import com.example.app.dto.UserCreationRequest;
import com.example.app.dto.UserResponse;
import com.example.app.entity.User;
import com.example.app.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthAndUserServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;
    private AuthService authService;
    private UserService userService;
    private AuthController authController;
    private UserController userController;

    private static final String SECRET = "freshvend-super-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256";

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtTokenProvider = new JwtTokenProvider(SECRET, 3600_000L);
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider);
        userService = new UserService(userRepository, passwordEncoder);
        authController = new AuthController(authService);
        userController = new UserController(userService);
    }

    @Test
    void login_Success_ReturnsTokenAndUserInfo() {
        User user = User.builder()
                .id("user-123")
                .username("admin")
                .password(passwordEncoder.encode("admin123"))
                .role("ADMIN")
                .build();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest("admin", "admin123");
        ResponseEntity<LoginResponse> responseEntity = authController.login(request);

        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        LoginResponse response = responseEntity.getBody();
        assertNotNull(response);
        assertNotNull(response.getToken());
        assertTrue(jwtTokenProvider.validateToken(response.getToken()));

        Claims claims = jwtTokenProvider.getClaimsFromToken(response.getToken());
        assertEquals("admin", claims.getSubject());
        assertEquals("user-123", claims.get("userId", String.class));
        assertEquals("ADMIN", claims.get("role", String.class));

        assertNotNull(response.getUser());
        assertEquals("user-123", response.getUser().getId());
        assertEquals("admin", response.getUser().getUsername());
        assertEquals("ADMIN", response.getUser().getRole());
    }

    @Test
    void login_WrongPassword_ThrowsException() {
        User user = User.builder()
                .id("user-123")
                .username("operator1")
                .password(passwordEncoder.encode("correct-password"))
                .role("OPERATOR")
                .build();
        when(userRepository.findByUsername("operator1")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest("operator1", "wrong-password");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertTrue(ex.getMessage().contains("không chính xác"));
    }

    @Test
    void login_UserNotFound_ThrowsException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("unknown", "anypass123");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertTrue(ex.getMessage().contains("không chính xác"));
    }

    @Test
    void getCurrentUser_SuccessAndNotFound() {
        User user = User.builder()
                .id("u-99")
                .username("operator99")
                .role(null)
                .build();
        when(userRepository.findByUsername("operator99")).thenReturn(Optional.of(user));

        LoginResponse.UserProfileDto profile = authService.getCurrentUser("operator99");
        assertEquals("u-99", profile.getId());
        assertEquals("operator99", profile.getUsername());
        assertEquals("OPERATOR", profile.getRole());

        assertThrows(RuntimeException.class, () -> authService.getCurrentUser(""));
        assertThrows(RuntimeException.class, () -> authService.getCurrentUser(null));
    }

    @Test
    void createUser_Success_EncodesPasswordAndReturnsFullNameAndRole() {
        when(userRepository.existsByUsername("newoperator")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId("generated-uuid-1");
            return u;
        });

        UserCreationRequest request = new UserCreationRequest(
                "newoperator", "password123", "Nguyen", "Van A", "vana@freshvend.com", "admin"
        );

        ApiResponse<UserResponse> apiResponse = userController.createUser(request);
        UserResponse response = apiResponse.getResult();

        assertNotNull(response);
        assertEquals("generated-uuid-1", response.getId());
        assertEquals("newoperator", response.getUsername());
        assertEquals("Nguyen Van A", response.getFullName());
        assertEquals("ADMIN", response.getRole());
        assertEquals("vana@freshvend.com", response.getEmail());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertTrue(passwordEncoder.matches("password123", captor.getValue().getPassword()));
    }

    @Test
    void createUser_DuplicateUsername_ThrowsException() {
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);

        UserCreationRequest request = new UserCreationRequest(
                "existinguser", "password123", "Tran", "B", "b@freshvend.com", "OPERATOR"
        );

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.createUser(request));
        assertEquals("User already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void getUsers_ReturnsFullListWithFullNameAndRole() {
        User u1 = User.builder()
                .id("id-1")
                .username("admin")
                .firstName("System")
                .lastName("Admin")
                .email("admin@freshvend.com")
                .role("ADMIN")
                .build();
        User u2 = User.builder()
                .id("id-2")
                .username("op_no_name")
                .firstName(null)
                .lastName(" ")
                .email("op@freshvend.com")
                .role(null)
                .build();

        when(userRepository.findAll()).thenReturn(List.of(u1, u2));

        ApiResponse<List<UserResponse>> apiResponse = userController.getUsers();
        List<UserResponse> users = apiResponse.getResult();

        assertEquals(2, users.size());
        assertEquals("System Admin", users.get(0).getFullName());
        assertEquals("ADMIN", users.get(0).getRole());

        assertEquals("op_no_name", users.get(1).getFullName());
        assertEquals("OPERATOR", users.get(1).getRole());
    }
}
