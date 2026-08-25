package com.clinicalnids.backend.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String department;
    private String phoneNumber;
    private String bio;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
