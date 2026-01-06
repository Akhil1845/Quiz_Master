package com.quizmaster.quizmaster.repository;

import com.quizmaster.quizmaster.entity.Result;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResultRepository extends JpaRepository<Result, Long> {
    List<Result> findByQuizId(Long quizId);
    List<Result> findByUserId(Long userId);
}
