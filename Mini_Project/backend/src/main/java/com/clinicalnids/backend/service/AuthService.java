package com.clinicalnids.backend.service;

import com.clinicalnids.backend.dto.AuthResponse;
import com.clinicalnids.backend.dto.LoginRequest;
import com.clinicalnids.backend.entity.User;
import com.clinicalnids.backend.repository.UserRepository;
import com.clinicalnids.backend.security.JwtTokenProvider;
import jakarta.annotation.PostConstruct;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
                    .active(true)
                    .build());
        }
        if (!userRepository.existsByEmail("analyst@hospital.org")) {
            userRepository.save(User.builder()
                    .email("analyst@hospital.org")
                    .password(passwordEncoder.encode("analyst123"))
                    .role(User.Role.SECURITY_ANALYST)
                    .fullName("John Smith")
                    .active(true)
                    .build());
        }
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String token = jwtTokenProvider.generateToken(authentication);
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getFullName());
    }
}
