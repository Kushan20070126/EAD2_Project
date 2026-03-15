package com.kushan.doctor_service.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DoctorResponse {

    private Long id;
    private String fullName;
    private String specialization;
    private String phone;
    private String email;
    private String roomNumber;
    private String availableDays;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
