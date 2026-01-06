package com.quizmaster.quizmaster.service;

import com.quizmaster.quizmaster.entity.UserActivity;
import com.quizmaster.quizmaster.repository.UserActivityRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserActivityService {

    private final UserActivityRepository userActivityRepository;

    public UserActivityService(UserActivityRepository userActivityRepository) {
        this.userActivityRepository = userActivityRepository;
    }

    public List<UserActivity> getActivityForUser(Long userId) {
        return userActivityRepository.findByUserId(userId);
    }

    public UserActivity saveActivity(UserActivity ua) {
        return userActivityRepository.save(ua);
    }
}
