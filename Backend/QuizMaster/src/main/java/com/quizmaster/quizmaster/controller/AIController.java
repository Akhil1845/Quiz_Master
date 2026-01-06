package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.service.GeminiService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
public class AIController {

    private final GeminiService geminiService;

    public AIController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/generate")
    public String generate(@RequestBody String prompt) {
        return geminiService.generateQuestions(prompt);
    }
}
