package com.clinicalnids.backend.repository;

import com.clinicalnids.backend.entity.AttackDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttackDetailRepository extends JpaRepository<AttackDetail, Long> {
    List<AttackDetail> findByDatasetId(Long datasetId);
}
