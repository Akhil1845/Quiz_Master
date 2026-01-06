package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.entity.Result;
import com.quizmaster.quizmaster.service.ResultService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ResultController {

    @Autowired
    private ResultService resultService;

    @GetMapping("/quizzes/{quizId}/results")
    public ResponseEntity<List<Result>> getResultsForQuiz(@PathVariable Long quizId) {
        List<Result> results = resultService.getResultsForQuiz(quizId);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/results")
    public ResponseEntity<List<Result>> getAllResults() {
        return ResponseEntity.ok(resultService.getAllResults());
    }

    @GetMapping("/users/{userId}/results")
    public ResponseEntity<List<Result>> getResultsForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(resultService.getResultsForUser(userId));
    }
}
