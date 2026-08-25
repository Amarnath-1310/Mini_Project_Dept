package com.clinicalnids.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of(
                "error", "Bad Request",
                "message", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        log.warn("File too large: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
                "error", "File Too Large",
                "message", "File size exceeds the maximum allowed limit (500MB)",
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleWebClientError(WebClientResponseException ex) {
        log.error("ML service error: {} {}", ex.getStatusCode(), ex.getMessage());
        String message = "ML service returned an error";
        if (ex.getStatusCode().value() == 404) {
            message = "Requested resource not found in ML service";
        } else if (ex.getStatusCode().value() == 422) {
            message = "Invalid dataset format or content";
        } else if (ex.getStatusCode().value() >= 500) {
            message = "ML service is experiencing issues. Please try again later.";
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "error", "ML Service Error",
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        log.error("Internal error", ex);
        String msg = ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred";

        // Provide user-friendly messages for common errors
        if (msg.contains("Connection refused") || msg.contains("Failed to connect")) {
            msg = "ML service is unavailable. Please ensure the ML service is running on port 8000.";
        } else if (msg.contains("timed out") || msg.contains("Timeout")) {
            msg = "The analysis took too long. Try with a smaller dataset or increase the timeout.";
        } else if (msg.contains("not found")) {
            msg = "The requested dataset was not found.";
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", msg,
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Internal Server Error",
                "message", "An unexpected error occurred",
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
