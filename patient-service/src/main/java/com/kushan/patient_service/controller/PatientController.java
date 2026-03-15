package com.kushan.patient_service.controller;

import com.kushan.patient_service.dto.PatientRequest;
import com.kushan.patient_service.dto.PatientResponse;
import com.kushan.patient_service.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    public ResponseEntity<PatientResponse> createPatient(@Valid @RequestBody PatientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(patientService.createPatient(request));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponse>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients());
    }

    @GetMapping("/active")
    public ResponseEntity<List<PatientResponse>> getActivePatients() {
        return ResponseEntity.ok(patientService.getActivePatients());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getPatientById(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> updatePatient(@PathVariable Long id, @Valid @RequestBody PatientRequest request) {
        return ResponseEntity.ok(patientService.updatePatient(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deactivatePatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.deactivatePatient(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PatientResponse>> searchPatients(@RequestParam String keyword) {
        return ResponseEntity.ok(patientService.searchPatients(keyword));
    }

    @GetMapping("/{id}/exists")
    public ResponseEntity<Boolean> patientExists(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.patientExistsAndActive(id));
    }
}