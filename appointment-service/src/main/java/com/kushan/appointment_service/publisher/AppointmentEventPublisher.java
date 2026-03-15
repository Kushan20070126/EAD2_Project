package com.kushan.appointment_service.publisher;


import com.kushan.appointment_service.config.RabbitMQConfig;
import com.kushan.appointment_service.event.AppointmentCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AppointmentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishAppointmentCreated(AppointmentCreatedEvent event) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.APPOINTMENT_CREATED_ROUTING_KEY,
                event
        );
    }
}
