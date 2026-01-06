package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.entity.User;
import com.quizmaster.quizmaster.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = {"http://localhost:5173","http://localhost:3000"})
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> ResponseEntity.ok(user))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return userRepository.findById(id).map(user -> {
            if (body.containsKey("username")) user.setUsername((String) body.get("username"));
            if (body.containsKey("email")) user.setEmail((String) body.get("email"));
            if (body.containsKey("avatar")) user.setAvatar((String) body.get("avatar"));
            if (body.containsKey("password")) user.setPassword((String) body.get("password"));
            User saved = userRepository.save(user);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("user", saved);
            return ResponseEntity.ok(resp);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
