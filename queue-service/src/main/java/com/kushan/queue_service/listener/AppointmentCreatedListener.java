package com.kushan.queue_service.listener;

import com.kushan.queue_service.config.RabbitMQConfig;
import com.kushan.queue_service.event.AppointmentCreatedEvent;
import com.kushan.queue_service.model.QueueEntry;
import com.kushan.queue_service.repository.QueueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AppointmentCreatedListener {

    private final QueueRepository queueRepository;

    @RabbitListener(
            queues = RabbitMQConfig.APPOINTMENT_CREATED_QUEUE,
            messageConverter = "rabbitMessageConverter"
    )
    public void handleAppointmentCreated(AppointmentCreatedEvent event) {
        if (queueRepository.existsByAppointmentId(event.getAppointmentId())) {
            return;
        }

        int nextQueueNumber = queueRepository
                .findTopByDoctorIdOrderByQueueNumberDesc(event.getDoctorId())
                .map(q -> q.getQueueNumber() + 1)
                .orElse(1);

        QueueEntry queueEntry = QueueEntry.builder()
                .appointmentId(event.getAppointmentId())
                .patientId(event.getPatientId())
                .doctorId(event.getDoctorId())
                .queueDate(event.getAppointmentDate())
                .queueNumber(nextQueueNumber)
                .status("WAITING")
                .build();

        queueRepository.save(queueEntry);
    }
}
