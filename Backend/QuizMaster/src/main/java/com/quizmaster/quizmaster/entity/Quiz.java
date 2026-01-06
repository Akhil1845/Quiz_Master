package com.quizmaster.quizmaster.entity;

import lombok.Data;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "quizzes")
@Data
public class Quiz {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "host_user_id")
    private User hostUser;

    private String title;

    @Column(name = "quiz_code", unique = true)
    private String quizCode;

    private String subject;
    private Integer difficulty;
    private String questionType;
    private String questionSource;
    private Integer numQuestions;
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @PrePersist
    public void prePersist() { createdAt = LocalDateTime.now(); }
}
