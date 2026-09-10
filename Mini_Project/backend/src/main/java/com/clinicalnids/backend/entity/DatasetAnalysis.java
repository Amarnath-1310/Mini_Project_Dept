package com.clinicalnids.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dataset_analysis")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DatasetAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename;

    private String originalFilename;

    @Column(nullable = false)
    private String ownerEmail;

    private Long totalRecords;

    private Integer totalColumns;

    private Integer featuresCount;

    private Long missingValues;

    private Long duplicateRecords;

    @Column(nullable = false)
    private String filePath;

    /** File type: parquet, csv, tsv, excel, feather, text */
    private String fileType;

    /** File size in bytes */
    private Long fileSize;

    /** ML service dataset ID for progress tracking correlation */
    private String mlDatasetId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private DatasetStatus status;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private LocalDateTime uploadedTime;

    private LocalDateTime analyzedTime;

    @PrePersist
    protected void onCreate() {
        if (uploadedTime == null) uploadedTime = LocalDateTime.now();
        if (status == null) status = DatasetStatus.UPLOADED;
    }

    public enum DatasetStatus {
        UPLOADED, ANALYZING, COMPLETED, FAILED
    }
}
