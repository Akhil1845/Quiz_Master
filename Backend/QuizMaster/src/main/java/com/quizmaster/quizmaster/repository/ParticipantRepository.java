package com.quizmaster.quizmaster.repository;

import com.quizmaster.quizmaster.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    List<Participant> findByQuizId(Long quizId);
}
