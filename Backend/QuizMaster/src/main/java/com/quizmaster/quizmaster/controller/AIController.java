package com.quizmaster.quizmaster.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizmaster.quizmaster.entity.Quiz;
import com.quizmaster.quizmaster.entity.QuestionEntity;
import com.quizmaster.quizmaster.entity.User;
import com.quizmaster.quizmaster.repository.UserRepository;
import com.quizmaster.quizmaster.repository.QuestionRepository;
import com.quizmaster.quizmaster.repository.QuizRepository;
import com.quizmaster.quizmaster.service.GeminiService;
import com.quizmaster.quizmaster.service.QuizService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    private final GeminiService geminiService;
    
    @Autowired
    private QuizService quizService;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuestionRepository questionRepository;

    public AIController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/generate")
    public String generate(@RequestBody String prompt) {
        String augmentedPrompt = appendRecentQuestionGuardrails(prompt);
        return geminiService.generateQuestions(augmentedPrompt);
    }

    private String appendRecentQuestionGuardrails(String prompt) {
        List<String> recentQuestions = getRecentQuestionTexts(100);
        if (recentQuestions.isEmpty()) {
            return prompt;
        }

        StringBuilder sb = new StringBuilder();
        sb.append(prompt == null ? "" : prompt.trim());
        sb.append("\n\n");
        sb.append("IMPORTANT: Do NOT repeat any of these recent questions from the last 10 quizzes. Use different wording and different facts.\n");
        sb.append("Avoid list:\n");
        for (String q : recentQuestions) {
            sb.append("- ").append(q).append("\n");
        }
        return sb.toString();
    }

    private List<String> getRecentQuestionTexts(int questionLimit) {
        List<Quiz> recentQuizzes = quizRepository.findTop10ByOrderByCreatedAtDesc();
        if (recentQuizzes == null || recentQuizzes.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> quizIds = recentQuizzes.stream()
                .map(Quiz::getId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (quizIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> questions = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (QuestionEntity q : questionRepository.findByQuizIdIn(quizIds)) {
            if (q == null || q.getQuestion() == null) {
                continue;
            }
            String text = q.getQuestion().trim();
            if (text.isEmpty()) {
                continue;
            }
            if (seen.add(text)) {
                questions.add(text);
            }
            if (questions.size() >= questionLimit) {
                break;
            }
        }

        return questions;
    }

    @PostMapping("/save-quiz")
    public ResponseEntity<?> saveQuiz(@RequestBody Map<String, Object> request) {
        try {
            // Extract data from request
            String quizCode = (String) request.get("quizCode");
            String title = (String) request.get("title");
            String subject = (String) request.get("subject");
            
            // Handle difficulty - could be String or Number
            Object difficultyObj = request.get("difficulty");
            Integer difficulty = null;
            if (difficultyObj instanceof String) {
                difficulty = Integer.parseInt((String) difficultyObj);
            } else if (difficultyObj instanceof Number) {
                difficulty = ((Number) difficultyObj).intValue();
            }
            
            String questionType = (String) request.get("questionType");
            String questionSource = (String) request.get("questionSource");
            
            // Handle numQuestions - could be String or Number
            Object numQuestionsObj = request.get("numQuestions");
            Integer numQuestions = null;
            if (numQuestionsObj instanceof String) {
                numQuestions = Integer.parseInt((String) numQuestionsObj);
            } else if (numQuestionsObj instanceof Number) {
                numQuestions = ((Number) numQuestionsObj).intValue();
            }
            
            // Handle hostUserId - could be String or Number
            Object hostUserIdObj = request.get("hostUserId");
            Long hostUserId = null;
            if (hostUserIdObj instanceof String) {
                hostUserId = Long.parseLong((String) hostUserIdObj);
            } else if (hostUserIdObj instanceof Number) {
                hostUserId = ((Number) hostUserIdObj).longValue();
            }
            
            List<Map<String, Object>> questionsData = (List<Map<String, Object>>) request.get("questions");

            // Find host user
            User hostUser = null;
            if (hostUserId != null && hostUserId > 0) {
                hostUser = userRepository.findById(hostUserId).orElse(null);
            }

            // Create and save quiz
            Quiz quiz = new Quiz();
            quiz.setQuizCode(quizCode);
            quiz.setTitle(title);
            quiz.setSubject(subject);
            quiz.setDifficulty(difficulty);
            quiz.setQuestionType(questionType);
            quiz.setQuestionSource(questionSource);
            quiz.setNumQuestions(numQuestions);
            quiz.setHostUser(hostUser);
            quiz.setStatus("waiting");
            quiz.setCreatedAt(LocalDateTime.now());

            Quiz savedQuiz = quizService.createQuiz(quiz);

            // Save questions
            ObjectMapper mapper = new ObjectMapper();
            if (questionsData != null && !questionsData.isEmpty()) {
                for (Map<String, Object> qData : questionsData) {
                    QuestionEntity qEntity = new QuestionEntity();
                    qEntity.setQuiz(savedQuiz);
                    qEntity.setQuestion((String) qData.get("question"));
                    qEntity.setType(questionType);
                    
                    // Handle points - could be String or Number
                    Object pointsObj = qData.getOrDefault("points", 10);
                    Integer points = 10;
                    if (pointsObj instanceof String) {
                        try {
                            points = Integer.parseInt((String) pointsObj);
                        } catch (NumberFormatException e) {
                            points = 10;
                        }
                    } else if (pointsObj instanceof Number) {
                        points = ((Number) pointsObj).intValue();
                    }
                    qEntity.setPoints(points);
                    qEntity.setCreatedAt(LocalDateTime.now());

                    // Handle options - convert to JSON string
                    List<?> options = (List<?>) qData.get("options");
                    if (options != null) {
                        qEntity.setOptions(mapper.writeValueAsString(options));
                    }

                    // Handle correctAnswer - convert to string and normalize
                    Object correctAnswer = qData.get("correctAnswer");
                    if (correctAnswer != null) {
                        String answer = correctAnswer.toString().trim();
                        // Remove "Option " prefix if it exists (Gemini sometimes adds it)
                        if (answer.startsWith("Option ")) {
                            answer = answer.substring(7).trim();
                        }
                        qEntity.setCorrectAnswer(answer);
                    }

                    quizService.addQuestion(savedQuiz.getId(), qEntity);
                }
            }

            return ResponseEntity.ok(new java.util.HashMap<String, Object>() {{
                put("message", "Quiz saved successfully");
                put("quizId", savedQuiz.getId());
                put("quizCode", savedQuiz.getQuizCode());
            }});
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new java.util.HashMap<String, Object>() {{
                put("error", e.getMessage());
                put("details", e.toString());
            }});
        }
    }

    @PostMapping("/evaluate-answer")
    public ResponseEntity<?> evaluateAnswer(@RequestBody Map<String, String> request) {
        try {
            String question = request.get("question");
            String referenceAnswer = request.get("referenceAnswer");
            String participantAnswer = request.get("participantAnswer");

            if (question == null || referenceAnswer == null || participantAnswer == null) {
                return ResponseEntity.badRequest().body(new java.util.HashMap<String, Object>() {{
                    put("error", "Missing required fields: question, referenceAnswer, participantAnswer");
                }});
            }

            int accuracy = geminiService.evaluateWrittenAnswer(question, referenceAnswer, participantAnswer);
            
            return ResponseEntity.ok(new java.util.HashMap<String, Object>() {{
                put("accuracy", accuracy);
                put("score", (accuracy >= 70 ? 10 : accuracy >= 50 ? 5 : 0)); // Score based on accuracy
            }});
        } catch (Exception e) {
            return ResponseEntity.status(500).body(new java.util.HashMap<String, Object>() {{
                put("error", "Evaluation failed: " + e.getMessage());
            }});
        }
    }
}
