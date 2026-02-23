package com.quizmaster.quizmaster.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizmaster.quizmaster.entity.*;
import com.quizmaster.quizmaster.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class QuizService {

    @Autowired private QuizRepository quizRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private AIQuizService aiQuizService;

    private final ObjectMapper mapper = new ObjectMapper();

    public Quiz createQuiz(Quiz quiz) {
        if (quiz.getQuizCode() == null) quiz.setQuizCode(UUID.randomUUID().toString().substring(0,6).toUpperCase());
        quiz.setStatus(quiz.getStatus() == null ? "waiting" : quiz.getStatus());
        return quizRepository.save(quiz);
    }

    public QuestionEntity addQuestion(Long quizId, QuestionEntity q) {
        Quiz quiz = quizRepository.findById(quizId).orElseThrow();
        q.setQuiz(quiz);
        return questionRepository.save(q);
    }

    public Quiz getQuizByCode(String quizCode) {
        return quizRepository.findByQuizCode(quizCode).orElse(null);
    }

    public Quiz startQuiz(String quizCode) {
        Quiz quiz = getQuizByCode(quizCode);
        if (quiz != null) {
            quiz.setStatus("started");
            quiz.setStartedAt(LocalDateTime.now());
            quiz = quizRepository.save(quiz);
            System.out.println("[QUIZ-SERVICE] Quiz " + quizCode + " started at " + quiz.getStartedAt());
        }
        return quiz;
    }

    public Quiz endQuiz(String quizCode) {
        Quiz quiz = getQuizByCode(quizCode);
        if (quiz != null) {
            quiz.setStatus("completed");
            quiz.setEndedAt(LocalDateTime.now());
            quiz = quizRepository.save(quiz);
            System.out.println("[QUIZ-SERVICE] Quiz " + quizCode + " ended at " + quiz.getEndedAt());
        }
        return quiz;
    }
}
