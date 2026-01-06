package com.quizmaster.quizmaster.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

import java.util.Collections;

@TestConfiguration
public class TestSecurityConfig {
    
    @Bean
    @Primary
    public UserDetailsService userDetailsService() {
        // Create a test user with no authorities for testing
        User testUser = new User(
            "test@example.com",
            "password",
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
        );
        
        return new InMemoryUserDetailsManager(testUser);
    }
}
