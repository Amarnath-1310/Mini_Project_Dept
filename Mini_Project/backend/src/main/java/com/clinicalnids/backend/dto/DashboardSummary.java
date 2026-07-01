package com.clinicalnids.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardSummary {
    private Long datasetId;
    private String filename;
    private String status;
    private Long totalRecords;
    private Integer totalFeatures;
    private Long normalTraffic;
    private Long attackTraffic;
    private Double attackPercentage;
    private List<AttackTypeEntry> attackTypes;
    private Double modelAccuracy;
    private String riskLevel;
    private Long totalColumns;
    private Long missingValues;
    private Long duplicateRecords;
    private Double avgConfidence;
    private Map<String, Long> severityDistribution;
    private List<FeatureEntry> globalFeatureImportance;
    private String uploadedTime;
    private String analyzedTime;

    @Data
    @Builder
    public static class AttackTypeEntry {
        private String type;
        private Long count;
        private Double percentage;
    }

    @Data
    @Builder
    public static class FeatureEntry {
        private String name;
        private Double impact;
        private String level;
    }
}
