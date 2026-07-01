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
     * Upload a .parquet dataset file.
     */
    @PostMapping("/dataset/upload")
    public ResponseEntity<DatasetUploadResponse> uploadDataset(
            @RequestParam("file") MultipartFile file) throws IOException {
        DatasetUploadResponse response = datasetService.uploadDataset(file);
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
     * List all uploaded datasets.
     */
    @GetMapping("/datasets")
    public ResponseEntity<List<Map<String, Object>>> listDatasets() {
        List<DatasetAnalysis> datasets = datasetService.listDatasets();
        List<Map<String, Object>> result = datasets.stream()
                .map(ds -> Map.<String, Object>of(
                        "id", ds.getId(),
                        "filename", ds.getOriginalFilename() != null ? ds.getOriginalFilename() : ds.getFilename(),
                        "status", ds.getStatus().name(),
                        "totalRecords", ds.getTotalRecords() != null ? ds.getTotalRecords() : 0,
                        "uploadedTime", ds.getUploadedTime() != null ? ds.getUploadedTime().toString() : "",
                        "analyzedTime", ds.getAnalyzedTime() != null ? ds.getAnalyzedTime().toString() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
