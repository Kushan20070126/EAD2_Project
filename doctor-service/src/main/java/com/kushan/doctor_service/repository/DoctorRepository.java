package com.kushan.doctor_service.repository;

import com.kushan.doctor_service.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    boolean existsByPhone(String phone);

    boolean existsByEmail(String email);

    Optional<Doctor> findByIdAndStatus(Long id, String status);

    List<Doctor> findByStatus(String status);

    List<Doctor> findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCase(
            String fullName, String specialization
    );
}