package com.clinicalnids.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "prediction_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_id", nullable = false)
    private Long datasetId;

    @Column(nullable = false)
    private Long normalCount;

    @Column(nullable = false)
    private Long attackCount;

    private Double accuracy;

    private String modelUsed;

    @Column(columnDefinition = "TEXT")
    private String attackDistribution;

    @Column(columnDefinition = "TEXT")
    private String severityDistribution;

    private String riskLevel;

    private Double avgConfidence;

    @Column(columnDefinition = "TEXT")
    private String globalFeatureImportance;

    private LocalDateTime createdTime;

    @PrePersist
    protected void onCreate() {
        if (createdTime == null) createdTime = LocalDateTime.now();
    }
}
