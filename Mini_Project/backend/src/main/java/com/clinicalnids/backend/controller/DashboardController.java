package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.dto.DashboardSummary;
import com.clinicalnids.backend.entity.AttackDetail;
import com.clinicalnids.backend.entity.DatasetAnalysis;
import com.clinicalnids.backend.entity.PredictionResult;
import com.clinicalnids.backend.repository.AttackDetailRepository;
import com.clinicalnids.backend.repository.DatasetAnalysisRepository;
import com.clinicalnids.backend.repository.PredictionResultRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DatasetAnalysisRepository datasetRepo;
    private final PredictionResultRepository predResultRepo;
    private final AttackDetailRepository attackDetailRepo;

    public DashboardController(DatasetAnalysisRepository datasetRepo,
                               PredictionResultRepository predResultRepo,
                               AttackDetailRepository attackDetailRepo) {
        this.datasetRepo = datasetRepo;
        this.predResultRepo = predResultRepo;
        this.attackDetailRepo = attackDetailRepo;
    }

    /**
     * GET /api/dashboard/{datasetId}/summary
     * Returns a complete dashboard summary from the database for a specific dataset.
     */
    @GetMapping("/{datasetId}/summary")
    public ResponseEntity<DashboardSummary> getDashboardSummary(@PathVariable Long datasetId) {
        DatasetAnalysis dataset = datasetRepo.findById(datasetId)
                .orElseThrow(() -> new RuntimeException("Dataset not found: " + datasetId));

        PredictionResult predResult = predResultRepo.findByDatasetId(datasetId).orElse(null);
        List<AttackDetail> attackDetails = attackDetailRepo.findByDatasetId(datasetId);

        long totalRecords = dataset.getTotalRecords() != null ? dataset.getTotalRecords() : 0;
        long normalCount = predResult != null ? predResult.getNormalCount() : 0;
        long attackCount = predResult != null ? predResult.getAttackCount() : 0;
        double attackPct = totalRecords > 0 ? Math.round((attackCount * 10000.0) / totalRecords) / 100.0 : 0.0;

        // Build attack type entries with percentages
        List<DashboardSummary.AttackTypeEntry> attackTypes = attackDetails.stream()
                .map(ad -> DashboardSummary.AttackTypeEntry.builder()
                        .type(ad.getAttackType())
                        .count(ad.getCount())
                        .percentage(attackCount > 0
                                ? Math.round((ad.getCount() * 10000.0) / attackCount) / 100.0
                                : 0.0)
                        .build())
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .collect(Collectors.toList());

        // Global feature importance
        List<DashboardSummary.FeatureEntry> globalFeatures = new ArrayList<>();
        if (predResult != null && predResult.getGlobalFeatureImportance() != null) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
                List<Map<String, Object>> feats = om.readValue(
                        predResult.getGlobalFeatureImportance(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                globalFeatures = feats.stream()
                        .map(f -> DashboardSummary.FeatureEntry.builder()
                                .name((String) f.get("name"))
                                .impact(f.get("impact") instanceof Number ? ((Number) f.get("impact")).doubleValue() : 0.0)
                                .level((String) f.getOrDefault("level", "LOW"))
                                .build())
                        .collect(Collectors.toList());
            } catch (Exception e) {
                // ignore parse errors
            }
        }

        DashboardSummary summary = DashboardSummary.builder()
                .datasetId(datasetId)
                .filename(dataset.getOriginalFilename() != null ? dataset.getOriginalFilename() : dataset.getFilename())
                .status(dataset.getStatus().name())
                .totalRecords(totalRecords)
                .totalFeatures(dataset.getFeaturesCount())
                .normalTraffic(normalCount)
                .attackTraffic(attackCount)
                .attackPercentage(attackPct)
                .attackTypes(attackTypes)
                .modelAccuracy(predResult != null ? predResult.getAccuracy() : 0.0)
                .riskLevel(predResult != null ? predResult.getRiskLevel() : "UNKNOWN")
                .totalColumns(dataset.getTotalColumns() != null ? dataset.getTotalColumns().longValue() : 0)
                .missingValues(dataset.getMissingValues() != null ? dataset.getMissingValues() : 0)
                .duplicateRecords(dataset.getDuplicateRecords() != null ? dataset.getDuplicateRecords() : 0)
                .avgConfidence(predResult != null ? predResult.getAvgConfidence() : 0.0)
                .severityDistribution(parseSeverityDistribution(predResult))
                .globalFeatureImportance(globalFeatures)
                .uploadedTime(dataset.getUploadedTime() != null ? dataset.getUploadedTime().toString() : "")
                .analyzedTime(dataset.getAnalyzedTime() != null ? dataset.getAnalyzedTime().toString() : "")
                .build();

        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/dashboard/latest/summary
     * Returns the summary for the most recently analyzed dataset.
     */
    @GetMapping("/latest/summary")
    public ResponseEntity<DashboardSummary> getLatestSummary() {
        List<DatasetAnalysis> datasets = datasetRepo.findAllByOrderByUploadedTimeDesc();
        if (datasets.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        // Find the first completed dataset
        Optional<DatasetAnalysis> latest = datasets.stream()
                .filter(d -> d.getStatus() == DatasetAnalysis.DatasetStatus.COMPLETED)
                .findFirst();
        if (latest.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return getDashboardSummary(latest.get().getId());
    }

    /**
     * GET /api/dashboard/datasets
     * Returns list of all datasets with basic info.
     */
    @GetMapping("/datasets")
    public ResponseEntity<List<Map<String, Object>>> listDatasets() {
        List<DatasetAnalysis> datasets = datasetRepo.findAllByOrderByUploadedTimeDesc();
        List<Map<String, Object>> result = datasets.stream()
                .map(ds -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", ds.getId());
                    map.put("filename", ds.getOriginalFilename() != null ? ds.getOriginalFilename() : ds.getFilename());
                    map.put("status", ds.getStatus().name());
                    map.put("totalRecords", ds.getTotalRecords() != null ? ds.getTotalRecords() : 0);
                    map.put("uploadedTime", ds.getUploadedTime() != null ? ds.getUploadedTime().toString() : "");
                    map.put("analyzedTime", ds.getAnalyzedTime() != null ? ds.getAnalyzedTime().toString() : "");
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, Long> parseSeverityDistribution(PredictionResult predResult) {
        if (predResult == null || predResult.getSeverityDistribution() == null) {
            return Map.of("CRITICAL", 0L, "HIGH", 0L, "MEDIUM", 0L, "LOW", 0L, "NONE", 0L);
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.readValue(predResult.getSeverityDistribution(),
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Long>>() {});
        } catch (Exception e) {
            return Map.of("CRITICAL", 0L, "HIGH", 0L, "MEDIUM", 0L, "LOW", 0L, "NONE", 0L);
        }
    }
}
