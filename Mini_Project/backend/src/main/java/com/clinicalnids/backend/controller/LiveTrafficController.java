package com.clinicalnids.backend.controller;

import com.clinicalnids.backend.entity.Alert;
import com.clinicalnids.backend.entity.Detection;
import com.clinicalnids.backend.entity.NetworkTraffic;
import com.clinicalnids.backend.repository.AlertRepository;
import com.clinicalnids.backend.repository.DetectionRepository;
import com.clinicalnids.backend.repository.NetworkTrafficRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic/live")
public class LiveTrafficController {

    private static final Logger log = LoggerFactory.getLogger(LiveTrafficController.class);

    private final WebClient mlWebClient;
    private final DetectionRepository detectionRepository;
    private final AlertRepository alertRepository;
    private final NetworkTrafficRepository trafficRepository;
    private final ObjectMapper objectMapper;

    public LiveTrafficController(
            @Value("${app.ml-service.url}") String mlServiceUrl,
            DetectionRepository detectionRepository,
            AlertRepository alertRepository,
            NetworkTrafficRepository trafficRepository,
            ObjectMapper objectMapper) {
        this.mlWebClient = WebClient.builder().baseUrl(mlServiceUrl).build();
        this.detectionRepository = detectionRepository;
        this.alertRepository = alertRepository;
        this.trafficRepository = trafficRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/start")
    public ResponseEntity<Map> startLiveCapture(@RequestBody(required = false) Map<String, Object> body) {
        try {
            Map result = mlWebClient.post()
                    .uri("/api/live-traffic/start")
                    .bodyValue(body != null ? body : new HashMap<>())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(5));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to start live traffic capture on ML service", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<Map> stopLiveCapture() {
        try {
            Map result = mlWebClient.post()
                    .uri("/api/live-traffic/stop")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(5));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to stop live traffic capture on ML service", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map> getLiveStatus() {
        try {
            Map result = mlWebClient.get()
                    .uri("/api/live-traffic/status")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(3));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("running", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/flows")
    public ResponseEntity<Map> getLiveFlows(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int since_id) {
        try {
            Map result = mlWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/live-traffic/flows")
                            .queryParam("limit", limit)
                            .queryParam("since_id", since_id)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(5));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/interfaces")
    public ResponseEntity<Map> getInterfaces() {
        try {
            Map result = mlWebClient.get()
                    .uri("/api/live-traffic/interfaces")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(Duration.ofSeconds(3));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("interfaces", new Object[0], "error", e.getMessage()));
        }
    }

    @PostMapping("/ingest")
    public ResponseEntity<Map<String, Object>> ingestLiveDetection(@RequestBody Map<String, Object> detectionData) {
        try {
            String sourceIp = (String) detectionData.getOrDefault("source_ip", "0.0.0.0");
            String destinationIp = (String) detectionData.getOrDefault("destination_ip", "0.0.0.0");
            Integer sourcePort = detectionData.get("source_port") != null ? ((Number) detectionData.get("source_port")).intValue() : 0;
            Integer destinationPort = detectionData.get("destination_port") != null ? ((Number) detectionData.get("destination_port")).intValue() : 0;
            String protocol = (String) detectionData.getOrDefault("protocol", "TCP");
            String prediction = (String) detectionData.getOrDefault("prediction", "Benign");
            double confidence = detectionData.get("confidence") != null ? ((Number) detectionData.get("confidence")).doubleValue() : 0.0;
            String severityStr = (String) detectionData.getOrDefault("severity", "NONE");
            boolean isAttack = (boolean) detectionData.getOrDefault("is_attack", false);

            NetworkTraffic traffic = NetworkTraffic.builder()
                    .sourceIp(sourceIp)
                    .destinationIp(destinationIp)
                    .sourcePort(sourcePort)
                    .destinationPort(destinationPort)
                    .protocol(protocol)
                    .rawFeatures(objectMapper.writeValueAsString(detectionData.getOrDefault("features", Map.of())))
                    .build();
            trafficRepository.save(traffic);

            Detection.Severity severity;
            try { severity = Detection.Severity.valueOf(severityStr); }
            catch (Exception e) { severity = Detection.Severity.NONE; }

            Detection detection = Detection.builder()
                    .attackType(prediction)
                    .confidence(confidence)
                    .severity(severity)
                    .explanation(objectMapper.writeValueAsString(detectionData.getOrDefault("explanation", Map.of())))
                    .sourceIp(sourceIp)
                    .destinationIp(destinationIp)
                    .sourcePort(sourcePort)
                    .destinationPort(destinationPort)
                    .protocol(protocol)
                    .isAttack(isAttack)
                    .probabilities(objectMapper.writeValueAsString(detectionData.getOrDefault("probabilities", Map.of())))
                    .build();
            detectionRepository.save(detection);

            if (isAttack) {
                Alert.AlertStatus status = confidence >= 0.85 ? Alert.AlertStatus.ACTIVE : Alert.AlertStatus.PENDING;
                Alert alert = Alert.builder()
                        .detection(detection)
                        .status(status)
                        .build();
                alertRepository.save(alert);
            }

            return ResponseEntity.ok(Map.of("success", true, "detectionId", detection.getId()));
        } catch (Exception e) {
            log.error("Failed to ingest live detection", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
