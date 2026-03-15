package com.kushan.appointment_service.service;

import com.kushan.appointment_service.client.DoctorClient;
import com.kushan.appointment_service.client.PatientClient;
import com.kushan.appointment_service.dto.AppointmentRequest;
import com.kushan.appointment_service.dto.AppointmentResponse;
import com.kushan.appointment_service.event.AppointmentCreatedEvent;
import com.kushan.appointment_service.exception.ResourceNotFoundException;
import com.kushan.appointment_service.model.Appointment;
import com.kushan.appointment_service.publisher.AppointmentEventPublisher;
import com.kushan.appointment_service.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientClient patientClient;
    private final DoctorClient doctorClient;
    private final AppointmentEventPublisher appointmentEventPublisher;

    public AppointmentResponse createAppointment(AppointmentRequest request) {
        validatePatientAndDoctor(request.getPatientId(), request.getDoctorId());
        validateDoctorSlot(request.getDoctorId(), request.getAppointmentDate(), request.getAppointmentTime(), null);

        Appointment appointment = Appointment.builder()
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .notes(request.getNotes())
                .status("BOOKED")
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        AppointmentCreatedEvent event = AppointmentCreatedEvent.builder()
                .appointmentId(saved.getId())
                .patientId(saved.getPatientId())
                .doctorId(saved.getDoctorId())
                .appointmentDate(saved.getAppointmentDate())
                .build();

        appointmentEventPublisher.publishAppointmentCreated(event);

        return mapToResponse(saved);
    }

    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    public AppointmentResponse getAppointmentById(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
        return mapToResponse(appointment);
    }

    public AppointmentResponse updateAppointment(Long id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));

        validatePatientAndDoctor(request.getPatientId(), request.getDoctorId());
        validateDoctorSlot(request.getDoctorId(), request.getAppointmentDate(), request.getAppointmentTime(), id);

        appointment.setPatientId(request.getPatientId());
        appointment.setDoctorId(request.getDoctorId());
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setNotes(request.getNotes());

        return mapToResponse(appointmentRepository.save(appointment));
    }

    public String cancelAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));

        appointment.setStatus("CANCELLED");
        appointmentRepository.save(appointment);

        return "Appointment cancelled successfully";
    }

    public String completeAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));

        appointment.setStatus("COMPLETED");
        appointmentRepository.save(appointment);

        return "Appointment completed successfully";
    }

    public String confirmAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));

        appointment.setStatus("CONFIRMED");
        appointmentRepository.save(appointment);

        return "Appointment confirmed successfully";
    }

    public List<AppointmentResponse> getAppointmentsByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId).stream().map(this::mapToResponse).toList();
    }

    public List<AppointmentResponse> getAppointmentsByDoctorId(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId).stream().map(this::mapToResponse).toList();
    }

    public List<AppointmentResponse> getAppointmentsByDate(LocalDate date) {
        return appointmentRepository.findByAppointmentDate(date).stream().map(this::mapToResponse).toList();
    }

    private void validatePatientAndDoctor(Long patientId, Long doctorId) {
        Boolean patientExists = patientClient.patientExists(patientId);
        if (patientExists == null || !patientExists) {
            throw new IllegalArgumentException("Patient does not exist or is inactive");
        }

        Boolean doctorExists = doctorClient.doctorExists(doctorId);
        if (doctorExists == null || !doctorExists) {
            throw new IllegalArgumentException("Doctor does not exist or is inactive");
        }
    }

    private void validateDoctorSlot(Long doctorId, LocalDate date, LocalTime time, Long currentAppointmentId) {
        appointmentRepository.findByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
                doctorId, date, time, "CANCELLED"
        ).ifPresent(existing -> {
            if (currentAppointmentId == null || !existing.getId().equals(currentAppointmentId)) {
                throw new IllegalArgumentException("Doctor already has an appointment at this date and time");
            }
        });
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatientId())
                .doctorId(appointment.getDoctorId())
                .appointmentDate(appointment.getAppointmentDate())
                .appointmentTime(appointment.getAppointmentTime())
                .status(appointment.getStatus())
                .notes(appointment.getNotes())
                .createdAt(appointment.getCreatedAt())
                .updatedAt(appointment.getUpdatedAt())
                .build();
    }
}