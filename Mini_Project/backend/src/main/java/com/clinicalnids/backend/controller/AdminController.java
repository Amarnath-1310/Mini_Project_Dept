package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.dto.UserProfileResponse;
import com.clinicalnids.backend.entity.User;
import com.clinicalnids.backend.repository.AlertRepository;
import com.clinicalnids.backend.repository.DatasetAnalysisRepository;
import com.clinicalnids.backend.repository.DetectionRepository;
import com.clinicalnids.backend.repository.NetworkTrafficRepository;
import com.clinicalnids.backend.repository.UserRepository;
import com.clinicalnids.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final DatasetAnalysisRepository datasetRepository;
    private final DetectionRepository detectionRepository;
    private final AlertRepository alertRepository;
    private final NetworkTrafficRepository trafficRepository;
    private final WebClient mlWebClient;

    public AdminController(UserRepository userRepository,
                           DatasetAnalysisRepository datasetRepository,
                           DetectionRepository detectionRepository,
                           AlertRepository alertRepository,
                           NetworkTrafficRepository trafficRepository,
                           @Value("${app.ml-service.url}") String mlServiceUrl) {
        this.userRepository = userRepository;
        this.datasetRepository = datasetRepository;
        this.detectionRepository = detectionRepository;
        this.alertRepository = alertRepository;
        this.trafficRepository = trafficRepository;
        this.mlWebClient = WebClient.builder().baseUrl(mlServiceUrl).build();
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserProfileResponse>> listUsers() {
        List<UserProfileResponse> users = userRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(AuthService::toProfileResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}/status")
    @Transactional
    public ResponseEntity<UserProfileResponse> toggleUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));

        if (authentication != null && authentication.getName().equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("You cannot deactivate your own administrative account.");
        }

        Boolean active = body.getOrDefault("active", !user.isActive());
        user.setActive(active);
        user = userRepository.save(user);

        return ResponseEntity.ok(AuthService.toProfileResponse(user));
    }

    @PutMapping("/users/{id}/role")
    @Transactional
    public ResponseEntity<UserProfileResponse> changeUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));

        String roleStr = body.get("role");
        if (roleStr == null) {
            throw new IllegalArgumentException("Role is required");
        }

        User.Role role = User.Role.valueOf(roleStr.toUpperCase());
        user.setRole(role);
        user = userRepository.save(user);

        return ResponseEntity.ok(AuthService.toProfileResponse(user));
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + id));

        if (authentication != null && authentication.getName().equalsIgnoreCase(user.getEmail())) {
            throw new IllegalArgumentException("You cannot delete your own administrative account.");
        }

        userRepository.delete(user);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User " + user.getEmail() + " deleted successfully."
        ));
    }

    @GetMapping("/system/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        // JVM Telemetry
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        long usedMemory = totalMemory - freeMemory;

        RuntimeMXBean runtimeMx = ManagementFactory.getRuntimeMXBean();
        long uptimeMs = runtimeMx.getUptime();

        Map<String, Object> jvm = new LinkedHashMap<>();
        jvm.put("usedMemoryMb", usedMemory / (1024 * 1024));
        jvm.put("totalMemoryMb", totalMemory / (1024 * 1024));
        jvm.put("maxMemoryMb", maxMemory / (1024 * 1024));
        jvm.put("uptimeSeconds", uptimeMs / 1000);
        jvm.put("javaVersion", System.getProperty("java.version"));
        status.put("jvm", jvm);

        // ML Service Status
        Map<String, Object> mlStatus = new LinkedHashMap<>();
        try {
            Map mlHealth = mlWebClient.get()
                    .uri("/api/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(3));
            mlStatus.put("online", true);
            mlStatus.put("details", mlHealth);
        } catch (Exception e) {
            mlStatus.put("online", false);
            mlStatus.put("error", e.getMessage());
        }
        status.put("mlService", mlStatus);

        // Database Statistics
        Map<String, Object> dbStats = new LinkedHashMap<>();
        dbStats.put("connected", true);
        dbStats.put("totalUsers", userRepository.count());
        dbStats.put("totalDatasets", datasetRepository.count());
        dbStats.put("totalDetections", detectionRepository.count());
        dbStats.put("totalAlerts", alertRepository.count());
        dbStats.put("totalTrafficFlows", trafficRepository.count());
        status.put("database", dbStats);

        status.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(status);
    }
}
