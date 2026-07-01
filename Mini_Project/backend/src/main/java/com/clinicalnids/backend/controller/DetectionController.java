package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.dto.DashboardStats;
import com.clinicalnids.backend.dto.TrafficRequest;
import com.clinicalnids.backend.entity.Detection;
import com.clinicalnids.backend.repository.DetectionRepository;
import com.clinicalnids.backend.service.DetectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DetectionController {

    private final DetectionService detectionService;
    private final DetectionRepository detectionRepository;

    public DetectionController(DetectionService detectionService, DetectionRepository detectionRepository) {
        this.detectionService = detectionService;
        this.detectionRepository = detectionRepository;
    }

    @PostMapping("/detection/predict")
    public ResponseEntity<Map<String, Object>> predict(@RequestBody TrafficRequest request) {
        return ResponseEntity.ok(detectionService.predict(request));
    }

    @GetMapping("/detections")
    public ResponseEntity<List<Detection>> getDetections(
            @RequestParam(defaultValue = "100") int limit) {
        List<Detection> detections = detectionRepository.findAll();
        int end = Math.min(limit, detections.size());
        return ResponseEntity.ok(detections.subList(0, end));
    }

    @GetMapping("/detections/{id}")
    public ResponseEntity<Detection> getDetection(@PathVariable Long id) {
        return detectionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/dashboard/statistics")
    public ResponseEntity<DashboardStats> getStatistics() {
        return ResponseEntity.ok(detectionService.getDashboardStats());
    }
}
