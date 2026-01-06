package com.quizmaster.quizmaster.service;

import com.quizmaster.quizmaster.entity.Result;
import com.quizmaster.quizmaster.repository.ResultRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ResultService {

    private final ResultRepository resultRepository;

    public ResultService(ResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

    public List<Result> getResultsForQuiz(Long quizId) {
        return resultRepository.findByQuizId(quizId);
    }

    public List<Result> getResultsForUser(Long userId) {
        return resultRepository.findByUserId(userId);
    }

    public List<Result> getAllResults() {
        return resultRepository.findAll();
    }

    public Result saveResult(Result r) {
        return resultRepository.save(r);
    }
}
