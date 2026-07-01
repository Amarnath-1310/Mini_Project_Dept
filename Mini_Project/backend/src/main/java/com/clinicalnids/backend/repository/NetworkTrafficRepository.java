package com.clinicalnids.backend.repository;

import com.clinicalnids.backend.entity.NetworkTraffic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NetworkTrafficRepository extends JpaRepository<NetworkTraffic, Long> {
}
