package com.clinicalnids.backend.service;

import com.clinicalnids.backend.entity.Alert;
import com.clinicalnids.backend.repository.AlertRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    public List<Alert> getAlertsByStatus(Alert.AlertStatus status) {
        return alertRepository.findByStatus(status);
    }

    public Alert getAlertById(Long id) {
        return alertRepository.findById(id).orElseThrow(() ->
                new RuntimeException("Alert not found: " + id));
    }

    public Alert markAsReviewed(Long id) {
        Alert alert = getAlertById(id);
        alert.setStatus(Alert.AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        return alertRepository.save(alert);
    }

    public Alert addNotes(Long id, String notes) {
        Alert alert = getAlertById(id);
        alert.setNotes(notes);
        return alertRepository.save(alert);
    }
}
