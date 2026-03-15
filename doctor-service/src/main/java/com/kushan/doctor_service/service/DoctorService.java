package com.kushan.doctor_service.service;

import com.kushan.doctor_service.dto.DoctorRequest;
import com.kushan.doctor_service.dto.DoctorResponse;
import com.kushan.doctor_service.exception.ResourceNotFoundException;
import com.kushan.doctor_service.model.Doctor;
import com.kushan.doctor_service.repository.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorResponse createDoctor(DoctorRequest request) {
        validateUniqueFields(request.getPhone(), request.getEmail(), null);

        Doctor doctor = Doctor.builder()
                .fullName(request.getFullName())
                .specialization(request.getSpecialization())
                .phone(request.getPhone())
                .email(request.getEmail())
                .roomNumber(request.getRoomNumber())
                .availableDays(request.getAvailableDays())
                .status("ACTIVE")
                .build();

        return mapToResponse(doctorRepository.save(doctor));
    }

    public List<DoctorResponse> getAllDoctors() {
        return doctorRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<DoctorResponse> getActiveDoctors() {
        return doctorRepository.findByStatus("ACTIVE")
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public DoctorResponse getDoctorById(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));
        return mapToResponse(doctor);
    }

    public DoctorResponse updateDoctor(Long id, DoctorRequest request) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));

        validateUniqueFields(request.getPhone(), request.getEmail(), id);

        doctor.setFullName(request.getFullName());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setPhone(request.getPhone());
        doctor.setEmail(request.getEmail());
        doctor.setRoomNumber(request.getRoomNumber());
        doctor.setAvailableDays(request.getAvailableDays());

        return mapToResponse(doctorRepository.save(doctor));
    }

    public String deactivateDoctor(Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + id));

        doctor.setStatus("INACTIVE");
        doctorRepository.save(doctor);

        return "Doctor deactivated successfully";
    }

    public List<DoctorResponse> searchDoctors(String keyword) {
        return doctorRepository.findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCase(keyword, keyword)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public boolean doctorExistsAndActive(Long id) {
        return doctorRepository.findByIdAndStatus(id, "ACTIVE").isPresent();
    }

    private void validateUniqueFields(String phone, String email, Long currentDoctorId) {
        List<Doctor> allDoctors = doctorRepository.findAll();

        for (Doctor doctor : allDoctors) {
            if (currentDoctorId != null && doctor.getId().equals(currentDoctorId)) {
                continue;
            }

            if (doctor.getPhone().equals(phone)) {
                throw new IllegalArgumentException("Phone number already exists");
            }

            if (doctor.getEmail().equalsIgnoreCase(email)) {
                throw new IllegalArgumentException("Email already exists");
            }
        }
    }

    private DoctorResponse mapToResponse(Doctor doctor) {
        return DoctorResponse.builder()
                .id(doctor.getId())
                .fullName(doctor.getFullName())
                .specialization(doctor.getSpecialization())
                .phone(doctor.getPhone())
                .email(doctor.getEmail())
                .roomNumber(doctor.getRoomNumber())
                .availableDays(doctor.getAvailableDays())
                .status(doctor.getStatus())
                .createdAt(doctor.getCreatedAt())
                .updatedAt(doctor.getUpdatedAt())
                .build();
    }
}