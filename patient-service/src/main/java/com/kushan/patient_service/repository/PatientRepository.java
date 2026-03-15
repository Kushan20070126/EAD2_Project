package com.kushan.patient_service.repository;

import com.kushan.patient_service.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);

    Optional<Patient> findByIdAndStatus(Long id, String status);

    List<Patient> findByStatus(String status);

    List<Patient> findByFullNameContainingIgnoreCaseOrPhoneContainingOrEmailContainingIgnoreCase(
            String fullName,
            String phone,
            String email
    );
}
