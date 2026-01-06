package com.quizmaster.quizmaster.controller;

import com.quizmaster.quizmaster.entity.UserActivity;
import com.quizmaster.quizmaster.service.UserActivityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserActivityController {

    @Autowired
    private UserActivityService userActivityService;

    @GetMapping("/{userId}/activity")
    public ResponseEntity<List<UserActivity>> getActivityForUser(@PathVariable Long userId) {
        List<UserActivity> activities = userActivityService.getActivityForUser(userId);
        return ResponseEntity.ok(activities);
    }
}
