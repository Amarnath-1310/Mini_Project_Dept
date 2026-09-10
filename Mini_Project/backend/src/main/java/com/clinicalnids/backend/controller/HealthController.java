package com.clinicalnids.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final WebClient mlClient;

    public HealthController(@Value("${app.ml-service.url}") String mlServiceUrl) {
        this.mlClient = WebClient.builder().baseUrl(mlServiceUrl).build();
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("backend", "UP");
        try {
            mlClient.get().uri("/api/health").retrieve().toBodilessEntity().block(Duration.ofSeconds(2));
            result.put("mlService", "UP");
        } catch (Exception e) {
            result.put("mlService", "DOWN");
        }
        result.put("status", "UP");
        return ResponseEntity.ok(result);
    }
}