package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.entity.Alert;
import com.clinicalnids.backend.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<List<Alert>> getAllAlerts(
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(alertService.getAlertsByStatus(Alert.AlertStatus.valueOf(status.toUpperCase())));
        }
        return ResponseEntity.ok(alertService.getAllAlerts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Alert> getAlert(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }

    @PutMapping("/{id}/review")
    public ResponseEntity<Alert> markAsReviewed(@PathVariable Long id) {
        return ResponseEntity.ok(alertService.markAsReviewed(id));
    }

    @PutMapping("/{id}/notes")
    public ResponseEntity<Alert> addNotes(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(alertService.addNotes(id, body.get("notes")));
    }
}
