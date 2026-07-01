package com.clinicalnids.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "attack_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttackDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_id", nullable = false)
    private Long datasetId;

    @Column(nullable = false)
    private String attackType;

    @Column(nullable = false)
    private Long count;

    private Double averageConfidence;

    @Column(nullable = false)
    private String severity;

    @Column(columnDefinition = "TEXT")
    private String topFeatures;
}
