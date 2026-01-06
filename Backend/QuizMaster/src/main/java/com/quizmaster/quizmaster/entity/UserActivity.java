package com.quizmaster.quizmaster.entity;

import lombok.Data;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_activity")
@Data
public class UserActivity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    private String title;
    private Integer score;
    private Double accuracy;

    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt;

    @PrePersist
    public void prePersist() { attemptedAt = LocalDateTime.now(); }
}
