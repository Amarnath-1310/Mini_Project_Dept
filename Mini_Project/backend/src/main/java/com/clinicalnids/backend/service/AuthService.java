package com.clinicalnids.backend.service;

import com.clinicalnids.backend.dto.AuthResponse;
import com.clinicalnids.backend.dto.LoginRequest;
import com.clinicalnids.backend.dto.RegisterRequest;
import com.clinicalnids.backend.dto.UpdateProfileRequest;
import com.clinicalnids.backend.dto.UserProfileResponse;
import com.clinicalnids.backend.entity.User;
import com.clinicalnids.backend.repository.UserRepository;
import com.clinicalnids.backend.security.JwtTokenProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
    }

    @PostConstruct
    public void initDefaultUsers() {
        if (!userRepository.existsByEmail("admin@hospital.org")) {
            userRepository.save(User.builder()
                    .email("admin@hospital.org")
                    .password(passwordEncoder.encode("admin123"))
                    .role(User.Role.ADMIN)
                    .fullName("Dr. Sarah Chen")
                    .department("Clinical Cyber-Defense & CISO")
                    .phoneNumber("+1 (555) 234-5678")
                    .bio("Lead Healthcare Security Specialist & MedSentry Security Architect.")
                    .active(true)
                    .build());
        }
        if (!userRepository.existsByEmail("analyst@hospital.org")) {
            userRepository.save(User.builder()
                    .email("analyst@hospital.org")
                    .password(passwordEncoder.encode("analyst123"))
                    .role(User.Role.SECURITY_ANALYST)
                    .fullName("John Smith")
                    .department("Hospital SOC Operations")
                    .phoneNumber("+1 (555) 876-5432")
                    .bio("Tier-2 SOC Security Analyst monitoring IoT medical devices and hospital PACS networks.")
                    .active(true)
                    .build());
        }
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String token = jwtTokenProvider.generateToken(authentication);
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found: " + request.getEmail()));

        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getFullName());
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("An account with email " + request.getEmail() + " already exists.");
        }

        User.Role role = request.getRole() != null ? request.getRole() : User.Role.SECURITY_ANALYST;

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(role)
                .department(request.getDepartment() != null && !request.getDepartment().isBlank() ? request.getDepartment() : "Healthcare Security")
                .phoneNumber(request.getPhoneNumber())
                .bio(request.getBio())
                .active(true)
                .build();

        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getFullName());
    }

    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        return toProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment().trim());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }
        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            if (request.getNewPassword().length() < 6) {
                throw new IllegalArgumentException("New password must be at least 6 characters long.");
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        user = userRepository.save(user);
        return toProfileResponse(user);
    }

    public static UserProfileResponse toProfileResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

