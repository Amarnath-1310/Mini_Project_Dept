package com.clinicalnids.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DatasetUploadResponse {
    private Long datasetId;
    private String filename;
    private Long fileSize;
    private String status;
    private String message;
}
