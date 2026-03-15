package com.kushan.api_gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/auth-service/auth/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // Patient read paths + booking
                        .requestMatchers(HttpMethod.POST, "/appointment-service/appointments").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/appointment-service/appointments/patient/*").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/queue-service/queues/patient/*").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/queue-service/queues/appointment/*").hasAnyRole("PATIENT", "DOCTOR", "DOCTER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/doctor-service/doctors/active").hasAnyRole("PATIENT", "DOCTOR", "DOCTER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/doctor-service/doctors/*").hasAnyRole("PATIENT", "DOCTOR", "DOCTER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/patient-service/patients").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/patient-service/patients/search").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/patient-service/patients/*").hasAnyRole("PATIENT", "ADMIN")

                        // Doctor queue management
                        .requestMatchers("/queue-service/**").hasAnyRole("ADMIN", "DOCTOR", "DOCTER")

                        // Admin full control for remaining paths
                        .requestMatchers("/patient-service/**").hasRole("ADMIN")
                        .requestMatchers("/doctor-service/**").hasRole("ADMIN")
                        .requestMatchers("/appointment-service/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
