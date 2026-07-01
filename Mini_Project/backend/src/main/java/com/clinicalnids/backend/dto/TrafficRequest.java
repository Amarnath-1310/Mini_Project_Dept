package com.clinicalnids.backend.dto;

import lombok.Data;
import java.util.Map;

@Data
public class TrafficRequest {
    private String sourceIp;
    private String destinationIp;
    private Integer sourcePort;
    private Integer destinationPort;
    private String protocol;
    private Map<String, Object> features;
}
