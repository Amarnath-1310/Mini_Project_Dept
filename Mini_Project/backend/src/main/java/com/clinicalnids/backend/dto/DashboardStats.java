package com.clinicalnids.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.util.Map;

@Data
@Builder
public class DashboardStats {
    private long totalFlows;
    private long totalAttacks;
    private long criticalAlerts;
    private double modelAccuracy;
    private long activeDevices;
    private Map<String, Long> attackTypes;
    private Map<String, Long> severityDistribution;
}
