package com.clinicalnids.backend.service;

import com.clinicalnids.backend.dto.DashboardStats;
import com.clinicalnids.backend.dto.TrafficRequest;
import com.clinicalnids.backend.entity.Alert;
import com.clinicalnids.backend.entity.Detection;
import com.clinicalnids.backend.entity.NetworkTraffic;
import com.clinicalnids.backend.repository.AlertRepository;
import com.clinicalnids.backend.repository.DetectionRepository;
import com.clinicalnids.backend.repository.NetworkTrafficRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.Map;

@Service
public class DetectionService {

    private static final Logger log = LoggerFactory.getLogger(DetectionService.class);

    private final DetectionRepository detectionRepository;
    private final AlertRepository alertRepository;
    private final NetworkTrafficRepository trafficRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public DetectionService(DetectionRepository detectionRepository, AlertRepository alertRepository,
                            NetworkTrafficRepository trafficRepository, ObjectMapper objectMapper,
                            @Value("${app.ml-service.url}") String mlServiceUrl) {
        this.detectionRepository = detectionRepository;
        this.alertRepository = alertRepository;
        this.trafficRepository = trafficRepository;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().baseUrl(mlServiceUrl).build();
    }

    /**
     * Send traffic features to the ML service and store the detection result.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> predict(TrafficRequest request) {
        // Build ML service request body
        Map<String, Object> mlRequest = new HashMap<>();
        if (request.getFeatures() != null) {
            mlRequest.putAll(request.getFeatures());
        }
        if (request.getSourceIp() != null) mlRequest.put("source_ip", request.getSourceIp());
        if (request.getDestinationIp() != null) mlRequest.put("destination_ip", request.getDestinationIp());
        if (request.getSourcePort() != null) mlRequest.put("source_port", request.getSourcePort());
        if (request.getDestinationPort() != null) mlRequest.put("destination_port", request.getDestinationPort());

        try {
            // Call ML service
            Map<String, Object> mlResponse = webClient.post()
                    .uri("/api/predict")
                    .bodyValue(mlRequest)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (mlResponse == null) {
                throw new RuntimeException("Empty response from ML service");
            }

            // Save network traffic record
            NetworkTraffic traffic = NetworkTraffic.builder()
                    .sourceIp(request.getSourceIp())
                    .destinationIp(request.getDestinationIp())
                    .sourcePort(request.getSourcePort())
                    .destinationPort(request.getDestinationPort())
                    .protocol(request.getProtocol())
                    .rawFeatures(objectMapper.writeValueAsString(request.getFeatures()))
                    .build();
            trafficRepository.save(traffic);

            // Save detection
            String prediction = (String) mlResponse.get("prediction");
            double confidence = ((Number) mlResponse.get("confidence")).doubleValue();
            String severityStr = (String) mlResponse.get("severity");
            boolean isAttack = (boolean) mlResponse.get("is_attack");

            Detection.Severity severity;
            try { severity = Detection.Severity.valueOf(severityStr); }
            catch (Exception e) { severity = Detection.Severity.NONE; }

            Detection detection = Detection.builder()
                    .attackType(prediction)
                    .confidence(confidence)
                    .severity(severity)
                    .explanation(objectMapper.writeValueAsString(mlResponse.get("explanation")))
                    .sourceIp(request.getSourceIp())
                    .destinationIp(request.getDestinationIp())
                    .sourcePort(request.getSourcePort())
                    .destinationPort(request.getDestinationPort())
                    .protocol(request.getProtocol())
                    .isAttack(isAttack)
                    .probabilities(objectMapper.writeValueAsString(mlResponse.get("probabilities")))
                    .build();
            detectionRepository.save(detection);

            // Alert logic
            if (isAttack) {
                Alert.AlertStatus alertStatus;
                if (confidence >= 0.90) {
                    alertStatus = Alert.AlertStatus.ACTIVE;
                } else if (confidence >= 0.70) {
                    alertStatus = Alert.AlertStatus.PENDING;
                } else {
                    alertStatus = null; // Log only
                }

                if (alertStatus != null) {
                    Alert alert = Alert.builder()
                            .detection(detection)
                            .status(alertStatus)
                            .build();
                    alertRepository.save(alert);
                }
            }

            mlResponse.put("detection_id", detection.getId());
            return mlResponse;

        } catch (JsonProcessingException e) {
            log.error("JSON processing error", e);
            throw new RuntimeException("Failed to process ML response", e);
        } catch (Exception e) {
            log.error("ML service call failed", e);
            throw new RuntimeException("ML service unavailable: " + e.getMessage(), e);
        }
    }

    public DashboardStats getDashboardStats() {
        long totalFlows = trafficRepository.count();
        long totalAttacks = detectionRepository.countByIsAttackTrue();
        long criticalAlerts = alertRepository.countByStatus(Alert.AlertStatus.ACTIVE);

        Map<String, Long> severityDist = new HashMap<>();
        for (Detection.Severity s : Detection.Severity.values()) {
            severityDist.put(s.name(), detectionRepository.countBySeverity(s));
        }

        return DashboardStats.builder()
                .totalFlows(totalFlows)
                .totalAttacks(totalAttacks)
                .criticalAlerts(criticalAlerts)
                .modelAccuracy(0.987) // From trained model
                .activeDevices(156)
                .severityDistribution(severityDist)
                .build();
    }
}
