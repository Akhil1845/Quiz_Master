package com.quizmaster.quizmaster.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizmaster.quizmaster.dto.PlayerAnswer;
import com.quizmaster.quizmaster.dto.PlayerResult;
import com.quizmaster.quizmaster.dto.PlayerSubmission;
import com.quizmaster.quizmaster.entity.*;
import com.quizmaster.quizmaster.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QuizService {

    @Autowired private QuizRepository quizRepository;
    @Autowired private QuestionRepository questionRepository;
    @Autowired private ParticipantRepository participantRepository;
    @Autowired private AnswerRepository answerRepository;
    @Autowired private ResultRepository resultRepository;
    @Autowired private UserActivityRepository userActivityRepository;
    @Autowired private AIQuizService aiQuizService;

    private final ObjectMapper mapper = new ObjectMapper();

    public Quiz createQuiz(Quiz quiz) {
        if (quiz.getQuizCode() == null) quiz.setQuizCode(UUID.randomUUID().toString().substring(0,6).toUpperCase());
        quiz.setStatus(quiz.getStatus() == null ? "waiting" : quiz.getStatus());
        return quizRepository.save(quiz);
    }

    public QuestionEntity addQuestion(Long quizId, QuestionEntity q) {
        Quiz quiz = quizRepository.findById(quizId).orElseThrow();
        q.setQuiz(quiz);
        return questionRepository.save(q);
    }

    public Participant addParticipant(Long quizId, Participant p) {
        Quiz quiz = quizRepository.findById(quizId).orElseThrow();
        p.setQuiz(quiz);
        return participantRepository.save(p);
    }

    public AnswerEntity submitAnswer(AnswerEntity a) {
        return answerRepository.save(a);
    }

    /**
     * Finalize scoring for a quiz: aggregate submissions and call AI grading for written answers.
     */
    public List<PlayerResult> finalizeQuiz(Long quizId) {
        List<AnswerEntity> answers = answerRepository.findByQuizId(quizId);

        // group by participant (fallback to userId)
        Map<String, List<PlayerAnswer>> byPlayer = new HashMap<>();
        for (AnswerEntity ae : answers) {
            String pid = ae.getParticipant() != null ? String.valueOf(ae.getParticipant().getId()) : (ae.getUser()!=null?"u"+ae.getUser().getId():"guest");
            List<PlayerAnswer> list = byPlayer.computeIfAbsent(pid, k -> new ArrayList<>());
            PlayerAnswer pa = new PlayerAnswer();
            pa.setQuestionId(ae.getQuestion() != null ? ae.getQuestion().getId() : null);
            pa.setReferenceAnswer(ae.getQuestion() != null ? ae.getQuestion().getCorrectAnswer() : null);
            pa.setAnswer(ae.getAnswerText());
            list.add(pa);
        }

        List<PlayerSubmission> submissions = new ArrayList<>();
        for (Map.Entry<String, List<PlayerAnswer>> e : byPlayer.entrySet()) {
            PlayerSubmission ps = new PlayerSubmission();
            ps.setPlayerId(e.getKey());
            ps.setPlayerName(e.getKey());
            ps.setAnswers(e.getValue());
            submissions.add(ps);
        }

        // Use AI scoring service
        List<PlayerResult> results = aiQuizService.scoreSubmissions(submissions);

        // Persist results and user_activity
        int rank = 1;
        for (PlayerResult pr : results) {
            Result r = new Result();
            Quiz q = quizRepository.findById(quizId).orElse(null);
            r.setQuiz(q);
            r.setTotalScore((int)Math.round(pr.getAverageScore()));
            r.setAccuracy(pr.getAverageScore());
            r.setRankPosition(rank++);
            resultRepository.save(r);

            // Optionally store user_activity for mapped user if exists
            // Try to map by playerId prefix 'u{userId}' used above
            if (pr.getPlayerId() != null && pr.getPlayerId().startsWith("u")) {
                String sid = pr.getPlayerId().substring(1);
                try {
                    Long uid = Long.parseLong(sid);
                    UserActivity ua = new UserActivity();
                    ua.setUser(new User()); ua.getUser().setId(uid);
                    ua.setQuiz(q);
                    ua.setTitle(q != null ? q.getTitle() : "Quiz");
                    ua.setScore((int)Math.round(pr.getAverageScore()));
                    ua.setAccuracy(pr.getAverageScore());
                    userActivityRepository.save(ua);
                } catch (Exception ignored) {}
            }
        }

        return results;
    }
}
