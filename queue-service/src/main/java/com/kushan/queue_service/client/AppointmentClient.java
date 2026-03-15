package com.kushan.queue_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "appointment-service")
public interface AppointmentClient {

    @GetMapping("/appointments/{id}")
    Object getAppointmentById(@PathVariable("id") Long id);
}