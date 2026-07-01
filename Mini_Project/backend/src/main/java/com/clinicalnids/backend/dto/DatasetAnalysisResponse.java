package com.clinicalnids.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DatasetAnalysisResponse {
    private Long datasetId;
    private String filename;
    private String status;

    // Dataset info
    private Long totalRecords;
    private Integer totalColumns;
    private Integer featuresCount;
    private Long missingValues;
    private Long duplicateRecords;
    private List<String> missingFeatures;

    // Security summary
    private Long normalCount;
    private Long attackCount;
    private Double avgConfidence;
    private String riskLevel;
    private Double modelAccuracy;

    // Attack info
    private Map<String, Long> attackDistribution;
    private Map<String, Long> severityDistribution;
    private List<AttackDetailDto> attackDetails;
    private List<FeatureImportanceDto> globalFeatureImportance;

    // Sample predictions for table
    private List<PredictionTableEntry> predictions;
    private Integer totalPredictions;

    @Data
    @Builder
    public static class AttackDetailDto {
        private String attackType;
        private Long count;
        private Double averageConfidence;
        private String severity;
        private List<FeatureImportanceDto> topFeatures;
    }

    @Data
    @Builder
    public static class FeatureImportanceDto {
        private String name;
        private Double impact;
        private String level;
    }

    @Data
    @Builder
    public static class PredictionTableEntry {
        private String flowId;
        private Integer flowIndex;
        private String attackType;
        private Double confidence;
        private String severity;
        private boolean isAttack;
    }
}
