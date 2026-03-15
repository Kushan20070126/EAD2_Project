package com.kushan.patient_service.service;

import com.kushan.patient_service.dto.PatientRequest;
import com.kushan.patient_service.dto.PatientResponse;
import com.kushan.patient_service.exception.ResourceNotFoundException;
import com.kushan.patient_service.model.Patient;
import com.kushan.patient_service.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientResponse createPatient(PatientRequest request) {
        validateUniqueFields(request.getPhone(), request.getEmail(), null);

        Patient patient = Patient.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(emptyToNull(request.getEmail()))
                .age(request.getAge())
                .gender(request.getGender())
                .address(request.getAddress())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .status("ACTIVE")
                .build();

        return mapToResponse(patientRepository.save(patient));
    }

    public List<PatientResponse> getAllPatients() {
        return patientRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PatientResponse> getActivePatients() {
        return patientRepository.findByStatus("ACTIVE")
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public PatientResponse getPatientById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));
        return mapToResponse(patient);
    }

    public PatientResponse updatePatient(Long id, PatientRequest request) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));

        validateUniqueFields(request.getPhone(), request.getEmail(), id);

        patient.setFullName(request.getFullName());
        patient.setPhone(request.getPhone());
        patient.setEmail(emptyToNull(request.getEmail()));
        patient.setAge(request.getAge());
        patient.setGender(request.getGender());
        patient.setAddress(request.getAddress());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());

        return mapToResponse(patientRepository.save(patient));
    }

    public String deactivatePatient(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + id));

        patient.setStatus("INACTIVE");
        patientRepository.save(patient);

        return "Patient deactivated successfully";
    }

    public List<PatientResponse> searchPatients(String keyword) {
        return patientRepository.findByFullNameContainingIgnoreCaseOrPhoneContainingOrEmailContainingIgnoreCase(
                        keyword,
                        keyword,
                        keyword
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public boolean patientExistsAndActive(Long id) {
        return patientRepository.findByIdAndStatus(id, "ACTIVE").isPresent();
    }

    private void validateUniqueFields(String phone, String email, Long currentPatientId) {
        List<Patient> allPatients = patientRepository.findAll();

        for (Patient p : allPatients) {
            if (currentPatientId != null && p.getId().equals(currentPatientId)) {
                continue;
            }

            if (p.getPhone().equals(phone)) {
                throw new IllegalArgumentException("Phone number already exists");
            }

            if (email != null && !email.isBlank() && p.getEmail() != null && p.getEmail().equalsIgnoreCase(email)) {
                throw new IllegalArgumentException("Email already exists");
            }
        }
    }

    private String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
}

    private PatientResponse mapToResponse(Patient patient) {
        return PatientResponse.builder()
                .id(patient.getId())
                .fullName(patient.getFullName())
                .phone(patient.getPhone())
                .email(patient.getEmail())
                .age(patient.getAge())
                .gender(patient.getGender())
                .address(patient.getAddress())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .status(patient.getStatus())
                .createdAt(patient.getCreatedAt())
                .updatedAt(patient.getUpdatedAt())
                .build();
    }
}
