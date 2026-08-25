package com.clinicalnids.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @NotBlank(message = "Full name cannot be empty")
    private String fullName;

    private String department;

    private String phoneNumber;

    private String bio;

    private String newPassword;
}
