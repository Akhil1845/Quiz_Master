package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.dto.PlayerResult;
import com.quizmaster.quizmaster.entity.*;
import com.quizmaster.quizmaster.repository.QuestionRepository;
import com.quizmaster.quizmaster.repository.ResultRepository;
import com.quizmaster.quizmaster.service.QuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    @Autowired private QuizService quizService;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ResultRepository resultRepository;

    @PostMapping
    public ResponseEntity<Quiz> createQuiz(@RequestBody Quiz quiz) {
        Quiz created = quizService.createQuiz(quiz);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/{quizId}/questions")
    public ResponseEntity<QuestionEntity> addQuestion(@PathVariable Long quizId, @RequestBody QuestionEntity q) {
        return ResponseEntity.ok(quizService.addQuestion(quizId, q));
    }

    @GetMapping("/questions/{quizCode}")
    public ResponseEntity<?> getQuestionsByCode(
            @PathVariable String quizCode,
            @RequestParam(defaultValue = "false") boolean includeAnswers) {
        try {
            // Find quiz by code
            Quiz quiz = quizService.getQuizByCode(quizCode);
            if (quiz == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Get all questions for this quiz
            java.util.List<QuestionEntity> questions = questionRepository.findByQuizId(quiz.getId());
            
            // Convert to DTO format
            java.util.List<Object> questionList = new java.util.ArrayList<>();
            ObjectMapper mapper = new ObjectMapper();
            if (questions != null) {
                for (QuestionEntity qe : questions) {
                    java.util.Map<String, Object> qMap = new java.util.HashMap<>();
                    qMap.put("id", qe.getId());
                    qMap.put("question", qe.getQuestion());
                    
                    // Parse options if it's a JSON string
                    Object options = qe.getOptions();
                    if (options instanceof String) {
                        try {
                            options = mapper.readValue((String) options, Object.class);
                        } catch (Exception e) {
                            // If parsing fails, keep it as is
                        }
                    }
                    qMap.put("options", options);
                    
                    // Only include correct answer if requested (for scoring/admin purposes)
                    // By default, hide correct answers from participants
                    if (includeAnswers) {
                        // Parse correctAnswer as integer if it's a string number (0, 1, 2, 3)
                        Object correctAnswer = qe.getCorrectAnswer();
                        if (correctAnswer instanceof String) {
                            try {
                                correctAnswer = Integer.parseInt((String) correctAnswer);
                            } catch (NumberFormatException e) {
                                // Keep as string if not a number
                            }
                        }
                        qMap.put("correctAnswer", correctAnswer);
                    }
                    qMap.put("type", qe.getType());
                    qMap.put("points", qe.getPoints() != null ? qe.getPoints() : 10);
                    questionList.add(qMap);
                }
            }
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("questions", questionList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new Object() {
                public String error = e.getMessage();
            });
        }
    }

    @GetMapping("/{quizCode}/results")
    public ResponseEntity<?> getQuizResults(@PathVariable String quizCode) {
        try {
            // Find quiz by code
            Quiz quiz = quizService.getQuizByCode(quizCode);
            if (quiz == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Get all results for this quiz
            List<Result> results = resultRepository.findByQuizIdOrderByScoreDesc(quiz.getId());
            
            // Convert to response format
            java.util.List<java.util.Map<String, Object>> resultList = new java.util.ArrayList<>();
            for (Result r : results) {
                java.util.Map<String, Object> rMap = new java.util.HashMap<>();
                rMap.put("playerId", r.getPlayer() != null ? r.getPlayer().getId() : null);
                rMap.put("playerName", r.getPlayerName());
                rMap.put("score", r.getScore());
                rMap.put("averageScore", r.getAverageScore());
                rMap.put("totalQuestions", r.getTotalQuestions());
                rMap.put("correctAnswers", r.getCorrectAnswers());
                resultList.add(rMap);
            }
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("results", resultList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new Object() {
                public String error = e.getMessage();
            });
        }
    }

    @PutMapping("/{quizCode}/start")
    public ResponseEntity<Quiz> startQuiz(@PathVariable String quizCode) {
        Quiz quiz = quizService.startQuiz(quizCode);
        if (quiz == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quiz);
    }

    @PutMapping("/{quizCode}/end")
    public ResponseEntity<Quiz> endQuiz(@PathVariable String quizCode) {
        Quiz quiz = quizService.endQuiz(quizCode);
        if (quiz == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quiz);
    }
}
