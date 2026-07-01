package com.clinicalnids.backend.service;

import com.clinicalnids.backend.dto.DatasetAnalysisResponse;
import com.clinicalnids.backend.dto.DatasetUploadResponse;
import com.clinicalnids.backend.entity.AttackDetail;
import com.clinicalnids.backend.entity.DatasetAnalysis;
import com.clinicalnids.backend.entity.PredictionResult;
import com.clinicalnids.backend.repository.AttackDetailRepository;
import com.clinicalnids.backend.repository.DatasetAnalysisRepository;
import com.clinicalnids.backend.repository.PredictionResultRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DatasetService {

    private static final Logger log = LoggerFactory.getLogger(DatasetService.class);

    private final DatasetAnalysisRepository datasetRepo;
    private final PredictionResultRepository predResultRepo;
    private final AttackDetailRepository attackDetailRepo;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public DatasetService(DatasetAnalysisRepository datasetRepo,
                          PredictionResultRepository predResultRepo,
                          AttackDetailRepository attackDetailRepo,
                          ObjectMapper objectMapper,
                          @Value("${app.ml-service.url}") String mlServiceUrl) {
        this.datasetRepo = datasetRepo;
        this.predResultRepo = predResultRepo;
        this.attackDetailRepo = attackDetailRepo;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl(mlServiceUrl)
                .build();
    }

    /**
     * Upload a parquet dataset file.
     * Stores the file locally and registers it in the database.
     */
    public DatasetUploadResponse uploadDataset(MultipartFile file) throws IOException {
        // Validate file type
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.endsWith(".parquet")) {
            throw new IllegalArgumentException("Only .parquet files are supported");
        }

        // Create upload directory (use absolute path for transferTo compatibility)
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        Files.createDirectories(uploadPath);

        // Generate unique filename
        String uniqueName = UUID.randomUUID().toString().substring(0, 8) + "_" + filename;
        Path filePath = uploadPath.resolve(uniqueName);

        // Save file
        file.transferTo(filePath.toFile());
        log.info("Dataset saved: {}", filePath);

        // Create database record
        DatasetAnalysis dataset = DatasetAnalysis.builder()
                .filename(uniqueName)
                .originalFilename(filename)
                .filePath(filePath.toString())
                .status(DatasetAnalysis.DatasetStatus.UPLOADED)
                .build();
        dataset = datasetRepo.save(dataset);

        return DatasetUploadResponse.builder()
                .datasetId(dataset.getId())
                .filename(filename)
                .fileSize(file.getSize())
                .status("uploaded")
                .message("Dataset uploaded successfully. Analysis will start automatically.")
                .build();
    }

    /**
     * Analyze an uploaded dataset by calling the ML service.
     */
    @SuppressWarnings("unchecked")
    public DatasetAnalysisResponse analyzeDataset(Long datasetId) {
        DatasetAnalysis dataset = datasetRepo.findById(datasetId)
                .orElseThrow(() -> new RuntimeException("Dataset not found: " + datasetId));

        // Mark as analyzing
        dataset.setStatus(DatasetAnalysis.DatasetStatus.ANALYZING);
        datasetRepo.save(dataset);

        try {
            // Step 1: Upload file to ML service via multipart
            Path filePath = Paths.get(dataset.getFilePath());

            org.springframework.util.LinkedMultiValueMap<String, Object> body =
                    new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.FileSystemResource(filePath.toFile()));

            Map<String, Object> mlUpload = webClient.post()
                    .uri("/api/upload")
                    .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(120));

            if (mlUpload == null) {
                throw new RuntimeException("Empty response from ML service upload");
            }

            String mlDatasetId = (String) mlUpload.get("dataset_id");
            log.info("ML service dataset_id: {}", mlDatasetId);

            // Step 2: Trigger analysis
            Map<String, Object> analysisResult = webClient.post()
                    .uri("/api/analyze/" + mlDatasetId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(600)); // 10 min timeout for large datasets

            if (analysisResult == null) {
                throw new RuntimeException("Empty analysis response from ML service");
            }

            // Step 3: Parse and store results
            return storeAnalysisResults(dataset, analysisResult);

        } catch (Exception e) {
            log.error("Analysis failed for dataset {}", datasetId, e);
            dataset.setStatus(DatasetAnalysis.DatasetStatus.FAILED);
            dataset.setErrorMessage(e.getMessage());
            datasetRepo.save(dataset);
            throw new RuntimeException("Analysis failed: " + e.getMessage(), e);
        }
    }

    /**
     * Store ML analysis results in the database.
     */
    @SuppressWarnings("unchecked")
    private DatasetAnalysisResponse storeAnalysisResults(DatasetAnalysis dataset,
                                                          Map<String, Object> result) throws JsonProcessingException {
        // Parse dataset_info
        Map<String, Object> dsInfo = (Map<String, Object>) result.getOrDefault("dataset_info", Map.of());
        dataset.setTotalRecords(toLong(dsInfo.get("total_records")));
        dataset.setTotalColumns(toInt(dsInfo.get("total_columns")));
        dataset.setFeaturesCount(toInt(dsInfo.get("features_count")));
        dataset.setMissingValues(toLong(dsInfo.get("missing_values")));
        dataset.setDuplicateRecords(toLong(dsInfo.get("duplicate_records")));
        dataset.setStatus(DatasetAnalysis.DatasetStatus.COMPLETED);
        dataset.setAnalyzedTime(LocalDateTime.now());
        datasetRepo.save(dataset);

        // Parse security_summary
        Map<String, Object> summary = (Map<String, Object>) result.getOrDefault("security_summary", Map.of());

        // Parse distributions
        Map<String, Long> attackDist = toMapLong(result.get("attack_distribution"));
        Map<String, Long> severityDist = toMapLong(result.get("severity_distribution"));

        // Store PredictionResult
        PredictionResult predResult = PredictionResult.builder()
                .datasetId(dataset.getId())
                .normalCount(toLong(summary.get("normal_count")))
                .attackCount(toLong(summary.get("attack_count")))
                .accuracy(toDouble(summary.get("model_accuracy")))
                .modelUsed("XGBoost NIDS")
                .attackDistribution(objectMapper.writeValueAsString(attackDist))
                .severityDistribution(objectMapper.writeValueAsString(severityDist))
                .riskLevel((String) summary.getOrDefault("risk_level", "UNKNOWN"))
                .avgConfidence(toDouble(summary.get("avg_confidence")))
                .globalFeatureImportance(objectMapper.writeValueAsString(result.get("global_feature_importance")))
                .build();
        predResultRepo.save(predResult);

        // Store AttackDetails
        List<Map<String, Object>> attackDetailsRaw = (List<Map<String, Object>>) result.getOrDefault("attack_details", List.of());
        List<DatasetAnalysisResponse.AttackDetailDto> attackDetailDtos = new ArrayList<>();
        for (Map<String, Object> ad : attackDetailsRaw) {
            AttackDetail detail = AttackDetail.builder()
                    .datasetId(dataset.getId())
                    .attackType((String) ad.get("attack_type"))
                    .count(toLong(ad.get("count")))
                    .averageConfidence(toDouble(ad.get("average_confidence")))
                    .severity((String) ad.getOrDefault("severity", "NONE"))
                    .topFeatures(objectMapper.writeValueAsString(ad.get("top_features")))
                    .build();
            attackDetailRepo.save(detail);

            // Build DTO
            List<Map<String, Object>> topFeaturesRaw = (List<Map<String, Object>>) ad.getOrDefault("top_features", List.of());
            List<DatasetAnalysisResponse.FeatureImportanceDto> featureDtos = topFeaturesRaw.stream()
                    .map(f -> DatasetAnalysisResponse.FeatureImportanceDto.builder()
                            .name((String) f.get("name"))
                            .impact(toDouble(f.get("impact")))
                            .level((String) f.getOrDefault("level", "LOW"))
                            .build())
                    .collect(Collectors.toList());

            attackDetailDtos.add(DatasetAnalysisResponse.AttackDetailDto.builder()
                    .attackType((String) ad.get("attack_type"))
                    .count(toLong(ad.get("count")))
                    .averageConfidence(toDouble(ad.get("average_confidence")))
                    .severity((String) ad.getOrDefault("severity", "NONE"))
                    .topFeatures(featureDtos)
                    .build());
        }

        // Parse global feature importance
        List<Map<String, Object>> globalFeatRaw = (List<Map<String, Object>>) result.getOrDefault("global_feature_importance", List.of());
        List<DatasetAnalysisResponse.FeatureImportanceDto> globalFeatDtos = globalFeatRaw.stream()
                .map(f -> DatasetAnalysisResponse.FeatureImportanceDto.builder()
                        .name((String) f.get("name"))
                        .impact(toDouble(f.get("impact")))
                        .level((String) f.getOrDefault("level", "LOW"))
                        .build())
                .collect(Collectors.toList());

        // Parse predictions for table
        List<Map<String, Object>> predsRaw = (List<Map<String, Object>>) result.getOrDefault("predictions", List.of());
        List<DatasetAnalysisResponse.PredictionTableEntry> predEntries = new ArrayList<>();
        for (Map<String, Object> p : predsRaw) {
            predEntries.add(DatasetAnalysisResponse.PredictionTableEntry.builder()
                    .flowId((String) p.get("id"))
                    .flowIndex(toInt(p.get("flow_index")))
                    .attackType((String) p.get("prediction"))
                    .confidence(toDouble(p.get("confidence")))
                    .severity((String) p.getOrDefault("severity", "NONE"))
                    .isAttack(Boolean.TRUE.equals(p.get("is_attack")))
                    .build());
        }

        // Missing features
        List<String> missingFeatures = (List<String>) dsInfo.getOrDefault("missing_features", List.of());

        return DatasetAnalysisResponse.builder()
                .datasetId(dataset.getId())
                .filename(dataset.getOriginalFilename())
                .status("completed")
                .totalRecords(dataset.getTotalRecords())
                .totalColumns(dataset.getTotalColumns())
                .featuresCount(dataset.getFeaturesCount())
                .missingValues(dataset.getMissingValues())
                .duplicateRecords(dataset.getDuplicateRecords())
                .missingFeatures(missingFeatures)
                .normalCount(toLong(summary.get("normal_count")))
                .attackCount(toLong(summary.get("attack_count")))
                .avgConfidence(toDouble(summary.get("avg_confidence")))
                .riskLevel((String) summary.getOrDefault("risk_level", "UNKNOWN"))
                .modelAccuracy(toDouble(summary.get("model_accuracy")))
                .attackDistribution(attackDist)
                .severityDistribution(severityDist)
                .attackDetails(attackDetailDtos)
                .globalFeatureImportance(globalFeatDtos)
                .predictions(predEntries)
                .totalPredictions(toInt(result.get("total_predictions")))
                .build();
    }

    /**
     * Get analysis result for a dataset.
     */
    @SuppressWarnings("unchecked")
    public DatasetAnalysisResponse getAnalysisResult(Long datasetId) {
        DatasetAnalysis dataset = datasetRepo.findById(datasetId)
                .orElseThrow(() -> new RuntimeException("Dataset not found: " + datasetId));

        PredictionResult predResult = predResultRepo.findByDatasetId(datasetId).orElse(null);
        List<AttackDetail> attackDetails = attackDetailRepo.findByDatasetId(datasetId);

        if (predResult == null) {
            return DatasetAnalysisResponse.builder()
                    .datasetId(datasetId)
                    .filename(dataset.getOriginalFilename())
                    .status(dataset.getStatus().name())
                    .build();
        }

        // Rebuild response from stored data
        Map<String, Long> attackDist = new HashMap<>();
        Map<String, Long> severityDist = new HashMap<>();
        try {
            if (predResult.getAttackDistribution() != null) {
                attackDist = objectMapper.readValue(predResult.getAttackDistribution(), new TypeReference<>() {});
            }
            if (predResult.getSeverityDistribution() != null) {
                severityDist = objectMapper.readValue(predResult.getSeverityDistribution(), new TypeReference<>() {});
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse stored distributions", e);
        }

        // Build attack detail DTOs
        List<DatasetAnalysisResponse.AttackDetailDto> attackDetailDtos = attackDetails.stream()
                .map(ad -> {
                    List<DatasetAnalysisResponse.FeatureImportanceDto> featureDtos = new ArrayList<>();
                    try {
                        if (ad.getTopFeatures() != null) {
                            List<Map<String, Object>> feats = objectMapper.readValue(ad.getTopFeatures(), new TypeReference<>() {});
                            featureDtos = feats.stream()
                                    .map(f -> DatasetAnalysisResponse.FeatureImportanceDto.builder()
                                            .name((String) f.get("name"))
                                            .impact(toDouble(f.get("impact")))
                                            .level((String) f.getOrDefault("level", "LOW"))
                                            .build())
                                    .collect(Collectors.toList());
                        }
                    } catch (JsonProcessingException e) {
                        log.warn("Failed to parse top features", e);
                    }
                    return DatasetAnalysisResponse.AttackDetailDto.builder()
                            .attackType(ad.getAttackType())
                            .count(ad.getCount())
                            .averageConfidence(ad.getAverageConfidence())
                            .severity(ad.getSeverity())
                            .topFeatures(featureDtos)
                            .build();
                })
                .collect(Collectors.toList());

        // Global feature importance
        List<DatasetAnalysisResponse.FeatureImportanceDto> globalFeats = new ArrayList<>();
        try {
            if (predResult.getGlobalFeatureImportance() != null) {
                List<Map<String, Object>> feats = objectMapper.readValue(predResult.getGlobalFeatureImportance(), new TypeReference<>() {});
                globalFeats = feats.stream()
                        .map(f -> DatasetAnalysisResponse.FeatureImportanceDto.builder()
                                .name((String) f.get("name"))
                                .impact(toDouble(f.get("impact")))
                                .level((String) f.getOrDefault("level", "LOW"))
                                .build())
                        .collect(Collectors.toList());
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse global feature importance", e);
        }

        return DatasetAnalysisResponse.builder()
                .datasetId(datasetId)
                .filename(dataset.getOriginalFilename())
                .status(dataset.getStatus().name())
                .totalRecords(dataset.getTotalRecords())
                .totalColumns(dataset.getTotalColumns())
                .featuresCount(dataset.getFeaturesCount())
                .missingValues(dataset.getMissingValues())
                .duplicateRecords(dataset.getDuplicateRecords())
                .normalCount(predResult.getNormalCount())
                .attackCount(predResult.getAttackCount())
                .avgConfidence(predResult.getAvgConfidence())
                .riskLevel(predResult.getRiskLevel())
                .modelAccuracy(predResult.getAccuracy())
                .attackDistribution(attackDist)
                .severityDistribution(severityDist)
                .attackDetails(attackDetailDtos)
                .globalFeatureImportance(globalFeats)
                .predictions(List.of()) // Predictions table fetched from ML service directly
                .totalPredictions(0)
                .build();
    }

    /**
     * List all uploaded datasets.
     */
    public List<DatasetAnalysis> listDatasets() {
        return datasetRepo.findAllByOrderByUploadedTimeDesc();
    }

    // ── Helpers ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Long> toMapLong(Object obj) {
        if (obj == null) return new HashMap<>();
        if (obj instanceof Map) {
            Map<String, Object> raw = (Map<String, Object>) obj;
            Map<String, Long> result = new HashMap<>();
            for (Map.Entry<String, Object> e : raw.entrySet()) {
                result.put(e.getKey(), toLong(e.getValue()));
            }
            return result;
        }
        return new HashMap<>();
    }

    private Long toLong(Object obj) {
        if (obj == null) return 0L;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try { return Long.parseLong(obj.toString()); } catch (Exception e) { return 0L; }
    }

    private Integer toInt(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(obj.toString()); } catch (Exception e) { return 0; }
    }

    private Double toDouble(Object obj) {
        if (obj == null) return 0.0;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try { return Double.parseDouble(obj.toString()); } catch (Exception e) { return 0.0; }
    }
}
