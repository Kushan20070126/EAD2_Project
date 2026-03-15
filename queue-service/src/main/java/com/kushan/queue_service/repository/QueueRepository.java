package com.kushan.queue_service.repository;

import com.kushan.queue_service.model.QueueEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;


public interface QueueRepository extends JpaRepository<QueueEntry, Long> {

    boolean existsByAppointmentId(Long appointmentId);

    Optional<QueueEntry> findByAppointmentId(Long appointmentId);

    List<QueueEntry> findByDoctorIdAndQueueDateOrderByQueueNumberAsc(Long doctorId, LocalDate queueDate);

    List<QueueEntry> findByPatientId(Long patientId);

    List<QueueEntry> findByQueueDateOrderByDoctorIdAscQueueNumberAsc(LocalDate queueDate);

    Optional<QueueEntry> findTopByDoctorIdAndQueueDateOrderByQueueNumberDesc(Long doctorId, LocalDate queueDate);

    Optional<QueueEntry> findTopByDoctorIdOrderByQueueNumberDesc(Long doctorId);

    Optional<QueueEntry> findFirstByDoctorIdAndQueueDateAndStatusOrderByQueueNumberAsc(
            Long doctorId, LocalDate queueDate, String status
    );
}
