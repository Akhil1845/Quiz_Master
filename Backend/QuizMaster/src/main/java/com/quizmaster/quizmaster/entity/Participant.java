package com.quizmaster.quizmaster.entity;

import lombok.Data;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "participants")
@Data
public class Participant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "is_host")
    private Boolean isHost = false;

    @PrePersist
    public void prePersist() { joinedAt = LocalDateTime.now(); }
}
