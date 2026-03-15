package com.kushan.queue_service.service;


import com.kushan.queue_service.client.AppointmentClient;
import com.kushan.queue_service.dto.QueueRequest;
import com.kushan.queue_service.dto.QueueResponse;
import com.kushan.queue_service.exception.ResourceNotFoundException;
import com.kushan.queue_service.model.QueueEntry;
import com.kushan.queue_service.repository.QueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueRepository queueRepository;
    private final AppointmentClient appointmentClient;

    public QueueResponse createQueueEntry(QueueRequest request) {
        validateAppointment(request.getAppointmentId());

        if (queueRepository.existsByAppointmentId(request.getAppointmentId())) {
            throw new IllegalArgumentException("Queue entry already exists for this appointment");
        }

        int nextQueueNumber = queueRepository
                .findTopByDoctorIdOrderByQueueNumberDesc(request.getDoctorId())
                .map(queue -> queue.getQueueNumber() + 1)
                .orElse(1);

        QueueEntry queueEntry = QueueEntry.builder()
                .appointmentId(request.getAppointmentId())
                .patientId(request.getPatientId())
                .doctorId(request.getDoctorId())
                .queueDate(request.getQueueDate())
                .queueNumber(nextQueueNumber)
                .status("WAITING")
                .build();

        return mapToResponse(queueRepository.save(queueEntry));
    }

    public List<QueueResponse> getAllQueueEntries() {
        return queueRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public QueueResponse getQueueEntryById(Long id) {
        QueueEntry queueEntry = queueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Queue entry not found with id: " + id));
        return mapToResponse(queueEntry);
    }

    public QueueResponse getQueueByAppointmentId(Long appointmentId) {
        QueueEntry queueEntry = queueRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Queue entry not found for appointment id: " + appointmentId
                ));
        return mapToResponse(queueEntry);
    }

    public List<QueueResponse> getQueueByDoctorAndDate(Long doctorId, LocalDate date) {
        return queueRepository.findByDoctorIdAndQueueDateOrderByQueueNumberAsc(doctorId, date)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<QueueResponse> getQueueByPatient(Long patientId) {
        return queueRepository.findByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<QueueResponse> getQueueByDate(LocalDate date) {
        return queueRepository.findByQueueDateOrderByDoctorIdAscQueueNumberAsc(date)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public QueueResponse callNextPatient(Long doctorId, LocalDate date) {
        QueueEntry next = queueRepository
                .findFirstByDoctorIdAndQueueDateAndStatusOrderByQueueNumberAsc(doctorId, date, "WAITING")
                .orElseThrow(() -> new ResourceNotFoundException("No waiting patients found"));

        next.setStatus("CALLED");
        return mapToResponse(queueRepository.save(next));
    }

    public String completeQueueEntry(Long id) {
        QueueEntry queueEntry = queueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Queue entry not found with id: " + id));

        queueEntry.setStatus("COMPLETED");
        queueRepository.save(queueEntry);

        return "Queue entry completed successfully";
    }

    public String cancelQueueEntry(Long id) {
        QueueEntry queueEntry = queueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Queue entry not found with id: " + id));

        queueEntry.setStatus("CANCELLED");
        queueRepository.save(queueEntry);

        return "Queue entry cancelled successfully";
    }

    public QueueResponse markWaiting(Long id) {
        QueueEntry queueEntry = queueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Queue entry not found with id: " + id));

        queueEntry.setStatus("WAITING");
        return mapToResponse(queueRepository.save(queueEntry));
    }

    private void validateAppointment(Long appointmentId) {
        try {
            Object appointment = appointmentClient.getAppointmentById(appointmentId);
            if (appointment == null) {
                throw new IllegalArgumentException("Appointment not found");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Appointment not found or appointment-service unavailable");
        }
    }

    private QueueResponse mapToResponse(QueueEntry queueEntry) {
        return QueueResponse.builder()
                .id(queueEntry.getId())
                .appointmentId(queueEntry.getAppointmentId())
                .patientId(queueEntry.getPatientId())
                .doctorId(queueEntry.getDoctorId())
                .queueDate(queueEntry.getQueueDate())
                .queueNumber(queueEntry.getQueueNumber())
                .status(queueEntry.getStatus())
                .createdAt(queueEntry.getCreatedAt())
                .updatedAt(queueEntry.getUpdatedAt())
                .build();
    }
}
