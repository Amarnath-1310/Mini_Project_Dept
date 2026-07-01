package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.entity.NetworkTraffic;
import com.clinicalnids.backend.repository.NetworkTrafficRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
public class TrafficController {

    private final NetworkTrafficRepository trafficRepository;

    public TrafficController(NetworkTrafficRepository trafficRepository) {
        this.trafficRepository = trafficRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadTraffic(@RequestParam("file") MultipartFile file) {
        // File upload handled by ML service directly
        // This endpoint stores the metadata in the database
        return ResponseEntity.ok(Map.of(
                "status", "uploaded",
                "filename", file.getOriginalFilename(),
                "size", file.getSize(),
                "message", "File uploaded. Use ML service /api/upload for analysis."
        ));
    }

    @GetMapping
    public ResponseEntity<List<NetworkTraffic>> getTraffic(@RequestParam(defaultValue = "100") int limit) {
        List<NetworkTraffic> all = trafficRepository.findAll();
        int end = Math.min(limit, all.size());
        return ResponseEntity.ok(all.subList(0, end));
    }
}
