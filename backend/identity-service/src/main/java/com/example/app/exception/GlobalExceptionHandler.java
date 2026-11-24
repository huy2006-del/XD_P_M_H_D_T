package com.example.app.exception;

import com.example.app.dto.ApiResponse;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    // 1. Bắt lỗi JWT Token hết hạn -> Trả về 401 Unauthorized (code 4011 để FE nhận diện)
    @ExceptionHandler(value = ExpiredJwtException.class)
    public ResponseEntity<ApiResponse<Object>> handlingExpiredJwtException(ExpiredJwtException exception) {
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(4011);
        apiResponse.setMessage("JWT token has expired");

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(apiResponse);
    }

    // 2. Bắt lỗi JWT Token sai chữ ký / sai định dạng -> Trả về 401 Unauthorized
    @ExceptionHandler(value = JwtException.class)
    public ResponseEntity<ApiResponse<Object>> handlingJwtException(JwtException exception) {
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(4012);
        apiResponse.setMessage("Invalid JWT signature or malformed token");

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(apiResponse);
    }

    // 3. Bắt lỗi phân quyền (@PreAuthorize) -> Trả về 403 Forbidden
    @ExceptionHandler(value = AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handlingAccessDeniedException(AccessDeniedException exception) {
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(4030);
        apiResponse.setMessage("Access denied: insufficient permissions");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(apiResponse);
    }

    // 4. Bắt các lỗi Validation (@Valid trong UserCreationRequest)
    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handlingValidation(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getFieldError();
        String enumKey = (fieldError != null) ? fieldError.getDefaultMessage() : "Invalid input";

        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(1002);
        apiResponse.setMessage(enumKey);

        return ResponseEntity.badRequest().body(apiResponse);
    }

    // 5. Bắt các lỗi RuntimeException chung
    @ExceptionHandler(value = RuntimeException.class)
    public ResponseEntity<ApiResponse<Object>> handlingRuntimeException(RuntimeException exception) {
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(1001);
        apiResponse.setMessage(exception.getMessage());

        return ResponseEntity.badRequest().body(apiResponse);
    }
}