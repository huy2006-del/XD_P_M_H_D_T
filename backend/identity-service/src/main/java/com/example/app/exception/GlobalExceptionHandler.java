package com.example.app.exception;

import com.example.app.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Bắt các lỗi RuntimeException chung
    @ExceptionHandler(value = RuntimeException.class)
    public ResponseEntity<ApiResponse<Object>> handlingRuntimeException(RuntimeException exception) {
        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(1001);
        apiResponse.setMessage(exception.getMessage());

        return ResponseEntity.badRequest().body(apiResponse);
    }

    // Bắt các lỗi Validation (@Valid trong UserCreationRequest)
    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handlingValidation(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getFieldError();
        String enumKey = (fieldError != null) ? fieldError.getDefaultMessage() : "Invalid input";

        ApiResponse<Object> apiResponse = new ApiResponse<>();
        apiResponse.setCode(1002);
        apiResponse.setMessage(enumKey);

        return ResponseEntity.badRequest().body(apiResponse);
    }
}
