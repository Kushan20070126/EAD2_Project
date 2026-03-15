package com.kushan.queue_service.controller;

import com.kushan.queue_service.dto.QueueRequest;
import com.kushan.queue_service.dto.QueueResponse;
import com.kushan.queue_service.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/queues")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    @PostMapping
    public ResponseEntity<QueueResponse> createQueueEntry(@Valid @RequestBody QueueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(queueService.createQueueEntry(request));
    }

    @GetMapping
    public ResponseEntity<List<QueueResponse>> getAllQueueEntries() {
        return ResponseEntity.ok(queueService.getAllQueueEntries());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QueueResponse> getQueueEntryById(@PathVariable Long id) {
        return ResponseEntity.ok(queueService.getQueueEntryById(id));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<QueueResponse> getQueueByAppointmentId(@PathVariable Long appointmentId) {
        return ResponseEntity.ok(queueService.getQueueByAppointmentId(appointmentId));
    }

    @GetMapping("/doctor/{doctorId}/date/{date}")
    public ResponseEntity<List<QueueResponse>> getQueueByDoctorAndDate(
            @PathVariable Long doctorId,
            @PathVariable LocalDate date) {
        return ResponseEntity.ok(queueService.getQueueByDoctorAndDate(doctorId, date));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<QueueResponse>> getQueueByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(queueService.getQueueByPatient(patientId));
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<QueueResponse>> getQueueByDate(@PathVariable LocalDate date) {
        return ResponseEntity.ok(queueService.getQueueByDate(date));
    }

    @PatchMapping("/doctor/{doctorId}/date/{date}/next")
    public ResponseEntity<QueueResponse> callNextPatient(
            @PathVariable Long doctorId,
            @PathVariable LocalDate date) {
        return ResponseEntity.ok(queueService.callNextPatient(doctorId, date));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<String> completeQueueEntry(@PathVariable Long id) {
        return ResponseEntity.ok(queueService.completeQueueEntry(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<String> cancelQueueEntry(@PathVariable Long id) {
        return ResponseEntity.ok(queueService.cancelQueueEntry(id));
    }

    @PatchMapping("/{id}/waiting")
    public ResponseEntity<QueueResponse> markWaiting(@PathVariable Long id) {
        return ResponseEntity.ok(queueService.markWaiting(id));
    }
}
