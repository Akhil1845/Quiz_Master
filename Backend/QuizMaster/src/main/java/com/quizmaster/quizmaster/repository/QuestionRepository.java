package com.quizmaster.quizmaster.repository;

import com.quizmaster.quizmaster.entity.QuestionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuestionRepository extends JpaRepository<QuestionEntity, Long> {
    List<QuestionEntity> findByQuizId(Long quizId);
}
