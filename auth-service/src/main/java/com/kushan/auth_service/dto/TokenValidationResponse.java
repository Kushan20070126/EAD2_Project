package com.kushan.auth_service.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class TokenValidationResponse {
    private boolean valid;
    private String email;
    private String role;
}
