package com.kushan.queue_service.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class QueueResponse {

    private Long id;
    private Long appointmentId;
    private Long patientId;
    private Long doctorId;
    private LocalDate queueDate;
    private Integer queueNumber;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
