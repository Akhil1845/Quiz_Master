package com.quizmaster.quizmaster.repository;

import com.quizmaster.quizmaster.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
    Optional<Quiz> findByQuizCode(String quizCode);

    List<Quiz> findTop10ByOrderByCreatedAtDesc();
}
