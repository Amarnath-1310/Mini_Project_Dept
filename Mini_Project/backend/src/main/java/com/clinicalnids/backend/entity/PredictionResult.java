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

    @Column(columnDefinition = "LONGTEXT")
    private String attackDistribution;

    @Column(columnDefinition = "LONGTEXT")
    private String severityDistribution;

    private String riskLevel;

    private Double avgConfidence;

    @Column(columnDefinition = "LONGTEXT")
    private String globalFeatureImportance;

    @Column(columnDefinition = "LONGTEXT")
    private String predictions;

    private LocalDateTime createdTime;

    @PrePersist
    protected void onCreate() {
        if (createdTime == null) createdTime = LocalDateTime.now();
    }
}
