package com.clinicalnids.backend.repository;

import com.clinicalnids.backend.entity.PredictionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PredictionResultRepository extends JpaRepository<PredictionResult, Long> {
    Optional<PredictionResult> findByDatasetId(Long datasetId);
    List<PredictionResult> findAllByOrderByCreatedTimeDesc();
}
