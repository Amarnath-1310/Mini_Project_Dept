package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.dto.DatasetAnalysisResponse;
import com.clinicalnids.backend.dto.DatasetUploadResponse;
import com.clinicalnids.backend.entity.DatasetAnalysis;
import com.clinicalnids.backend.service.DatasetService;
import com.clinicalnids.backend.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class DatasetController {

    private final DatasetService datasetService;
    private final ReportService reportService;

    public DatasetController(DatasetService datasetService, ReportService reportService) {
        this.datasetService = datasetService;
        this.reportService = reportService;
    }

    /**
     * Upload a dataset file (supports .parquet, .csv, .tsv, .xlsx, .xls, .feather, .txt).
     */
    @PostMapping("/dataset/upload")
    public ResponseEntity<DatasetUploadResponse> uploadDataset(
            @RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
        DatasetUploadResponse response = datasetService.uploadDataset(file, authentication.getName());
        return ResponseEntity.ok(response);
    }

    /**
     * Analyze an uploaded dataset. Runs ML prediction + SHAP explanation.
     */
    @PostMapping("/dataset/{id}/analyze")
    public ResponseEntity<DatasetAnalysisResponse> analyzeDataset(@PathVariable Long id) {
        DatasetAnalysisResponse response = datasetService.analyzeDataset(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get analysis progress for a dataset (relays from ML service).
     */
    @GetMapping("/dataset/{id}/progress")
    public ResponseEntity<Map<String, Object>> getAnalysisProgress(@PathVariable Long id) {
        Map<String, Object> progress = datasetService.getAnalysisProgress(id);
        return ResponseEntity.ok(progress);
    }

    /**
     * Get analysis results for a dataset.
     */
    @GetMapping("/dataset/{id}/analysis")
    public ResponseEntity<DatasetAnalysisResponse> getAnalysis(@PathVariable Long id) {
        DatasetAnalysisResponse response = datasetService.getAnalysisResult(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Generate and download PDF security report.
     */
    @GetMapping("/dataset/{id}/report")
    public ResponseEntity<byte[]> downloadReport(@PathVariable Long id) {
        DatasetAnalysisResponse analysis = datasetService.getAnalysisResult(id);
        byte[] pdfBytes = reportService.generatePdfReport(analysis);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "ClinicalNIDS_Report_" + analysis.getDatasetId() + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    /**
     * Download CSV report.
     */
    @GetMapping("/dataset/{id}/report/csv")
    public ResponseEntity<String> downloadCsvReport(@PathVariable Long id) {
        DatasetAnalysisResponse analysis = datasetService.getAnalysisResult(id);
        String csv = reportService.generateCsvReport(analysis);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment",
                "ClinicalNIDS_Report_" + id + ".csv");

        return ResponseEntity.ok().headers(headers).body(csv);
    }

    /**
     * Download Excel report.
     */
    @GetMapping("/dataset/{id}/report/excel")
    public ResponseEntity<byte[]> downloadExcelReport(@PathVariable Long id) {
        DatasetAnalysisResponse analysis = datasetService.getAnalysisResult(id);
        byte[] excelBytes = reportService.generateExcelReport(analysis);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment",
                "ClinicalNIDS_Report_" + id + ".xlsx");
        headers.setContentLength(excelBytes.length);

        return ResponseEntity.ok().headers(headers).body(excelBytes);
    }

    /**
     * Download JSON report.
     */
    @GetMapping("/dataset/{id}/report/json")
    public ResponseEntity<DatasetAnalysisResponse> downloadJsonReport(@PathVariable Long id) {
        DatasetAnalysisResponse analysis = datasetService.getAnalysisResult(id);
        return ResponseEntity.ok(analysis);
    }

    /**
     * List all uploaded datasets.
     */
    @GetMapping("/datasets")
    public ResponseEntity<List<Map<String, Object>>> listDatasets(Authentication authentication) {
        List<DatasetAnalysis> datasets = datasetService.listDatasets(authentication.getName());
        List<Map<String, Object>> result = datasets.stream()
                .map(ds -> {
                    Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("id", ds.getId());
                    map.put("filename", ds.getOriginalFilename() != null ? ds.getOriginalFilename() : ds.getFilename());
                    map.put("status", ds.getStatus().name());
                    map.put("totalRecords", ds.getTotalRecords() != null ? ds.getTotalRecords() : 0);
                    map.put("fileType", ds.getFileType() != null ? ds.getFileType() : "unknown");
                    map.put("fileSize", ds.getFileSize() != null ? ds.getFileSize() : 0);
                    map.put("uploadedTime", ds.getUploadedTime() != null ? ds.getUploadedTime().toString() : "");
                    map.put("analyzedTime", ds.getAnalyzedTime() != null ? ds.getAnalyzedTime().toString() : "");
                    return map;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Delete an uploaded dataset and all related records.
     */
    @DeleteMapping({"/dataset/{id}", "/admin/datasets/{id}"})
    public ResponseEntity<Map<String, Object>> deleteDataset(@PathVariable Long id) {
        datasetService.deleteDataset(id);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "datasetId", id,
                "message", "Dataset and all associated records deleted successfully."
        ));
    }
}
