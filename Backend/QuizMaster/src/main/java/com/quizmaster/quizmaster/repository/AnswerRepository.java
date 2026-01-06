package com.quizmaster.quizmaster.repository;

import com.quizmaster.quizmaster.entity.AnswerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnswerRepository extends JpaRepository<AnswerEntity, Long> {
    List<AnswerEntity> findByQuizId(Long quizId);
    List<AnswerEntity> findByParticipantId(Long participantId);
}
