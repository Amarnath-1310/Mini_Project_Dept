package com.clinicalnids.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "detections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Detection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String attackType;

    @Column(nullable = false)
    private Double confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    private String sourceIp;
    private String destinationIp;
    private Integer sourcePort;
    private Integer destinationPort;
    private String protocol;

    private boolean isAttack;

    @Column(columnDefinition = "TEXT")
    private String probabilities;

    private LocalDateTime detectedTime;

    @PrePersist
    protected void onCreate() {
        if (detectedTime == null) detectedTime = LocalDateTime.now();
    }

    public enum Severity {
        CRITICAL, HIGH, MEDIUM, LOW, NONE
    }
}
