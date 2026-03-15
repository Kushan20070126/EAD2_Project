package com.kushan.appointment_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "clinic.exchange";
    public static final String APPOINTMENT_CREATED_QUEUE = "queue.appointment.created";
    public static final String APPOINTMENT_CREATED_ROUTING_KEY = "appointment.created";

    @Bean
    public TopicExchange clinicExchange() {
        return new TopicExchange(EXCHANGE);
    }

    @Bean
    public Queue appointmentCreatedQueue() {
        return new Queue(APPOINTMENT_CREATED_QUEUE, true);
    }

    @Bean
    public Binding appointmentCreatedBinding() {
        return BindingBuilder
                .bind(appointmentCreatedQueue())
                .to(clinicExchange())
                .with(APPOINTMENT_CREATED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter rabbitMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
