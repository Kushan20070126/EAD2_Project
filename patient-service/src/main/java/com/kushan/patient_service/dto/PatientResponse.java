package com.kushan.patient_service.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
public class PatientResponse {

    private Long id;
    private String fullName;
    private String phone;
    private String email;
    private Integer age;
    private String gender;
    private String address;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}