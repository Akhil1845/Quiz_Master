package com.quizmaster.quizmaster.entity;

import lombok.Data;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "results")
@Data
public class Result {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne
    @JoinColumn(name = "participant_id")
    private Participant participant;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "total_score")
    private Integer totalScore;

    private Double accuracy;

    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @Column(name = "rank_position")
    private Integer rankPosition;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() { createdAt = LocalDateTime.now(); }
}
