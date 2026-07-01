package com.clinicalnids.backend.repository;

import com.clinicalnids.backend.entity.DatasetAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DatasetAnalysisRepository extends JpaRepository<DatasetAnalysis, Long> {
    List<DatasetAnalysis> findAllByOrderByUploadedTimeDesc();
    List<DatasetAnalysis> findByStatus(DatasetAnalysis.DatasetStatus status);
}
