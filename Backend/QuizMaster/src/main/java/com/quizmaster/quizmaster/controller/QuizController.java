package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.dto.PlayerResult;
import com.quizmaster.quizmaster.entity.*;
import com.quizmaster.quizmaster.repository.ParticipantRepository;
import com.quizmaster.quizmaster.service.QuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    @Autowired private QuizService quizService;
    @Autowired private ParticipantRepository participantRepository;

    @PostMapping
    public ResponseEntity<Quiz> createQuiz(@RequestBody Quiz quiz) {
        Quiz created = quizService.createQuiz(quiz);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/{quizId}/questions")
    public ResponseEntity<QuestionEntity> addQuestion(@PathVariable Long quizId, @RequestBody QuestionEntity q) {
        return ResponseEntity.ok(quizService.addQuestion(quizId, q));
    }

    @PostMapping("/{quizId}/participants")
    public ResponseEntity<Participant> addParticipant(@PathVariable Long quizId, @RequestBody Participant p) {
        Participant added = quizService.addParticipant(quizId, p);
        return ResponseEntity.ok(added);
    }

    @PostMapping("/{quizId}/answers")
    public ResponseEntity<?> submitAnswer(@PathVariable Long quizId, @RequestBody AnswerEntity a) {
        a.setQuiz(new Quiz()); a.getQuiz().setId(quizId);
        AnswerEntity saved = quizService.submitAnswer(a);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{quizId}/finalize")
    public ResponseEntity<List<PlayerResult>> finalizeQuiz(@PathVariable Long quizId) {
        List<PlayerResult> results = quizService.finalizeQuiz(quizId);
        return ResponseEntity.ok(results);
    }
}
