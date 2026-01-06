package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.dto.RegisterRequest;
import com.quizmaster.quizmaster.entity.User;
import com.quizmaster.quizmaster.service.AuthService;

import javax.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:3000"
        }
)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ===================== REGISTER =====================
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {

        User user = authService.register(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Registration successful");
        response.put("user", user);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ===================== LOGIN =====================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {

        String email = request.get("email");
        String password = request.get("password");

        User user = authService.login(email, password);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("user", user);

        // Token placeholder (optional)
        response.put("token", "TEMP_TOKEN");

        return ResponseEntity.ok(response);
    }
}
