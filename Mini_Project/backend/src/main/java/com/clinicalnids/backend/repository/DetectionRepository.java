package com.clinicalnids.backend.repository;

import com.clinicalnids.backend.entity.Detection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DetectionRepository extends JpaRepository<Detection, Long> {
    List<Detection> findByIsAttackTrue();
    List<Detection> findBySeverity(Detection.Severity severity);
    List<Detection> findByDetectedTimeBetween(LocalDateTime start, LocalDateTime end);
    long countByIsAttackTrue();
    long countBySeverity(Detection.Severity severity);
}
