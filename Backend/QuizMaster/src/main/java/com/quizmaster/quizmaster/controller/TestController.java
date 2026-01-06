package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.entity.User;
import com.quizmaster.quizmaster.service.AuthService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    private final AuthService authService;

    public TestController(AuthService authService) {
        this.authService = authService;
    }

    // ✅ Simple test endpoint to check backend is running
    @GetMapping("/ping")
    public String ping() {
        return "Backend is running successfully ✅";
    }

    // ✅ Test login without frontend
    @PostMapping("/login")
    public User testLogin(@RequestBody Map<String, String> request) {
        return authService.login(
                request.get("email"),
                request.get("password")
        );
    }
}
