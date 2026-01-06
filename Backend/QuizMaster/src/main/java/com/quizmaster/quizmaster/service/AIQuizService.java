package com.quizmaster.quizmaster.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quizmaster.quizmaster.dto.Question;
import com.quizmaster.quizmaster.dto.QuizRequest;
import com.quizmaster.quizmaster.dto.PlayerAnswer;
import com.quizmaster.quizmaster.dto.PlayerSubmission;
import com.quizmaster.quizmaster.dto.PlayerResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIQuizService {

    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    private final WebClient webClient;

    public AIQuizService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .build();
    }

    public List<Question> generateQuiz(QuizRequest req) {
        String prompt = buildPrompt(req);

        String aiResponse = callAiModel(prompt, req);

        try {
            List<Question> questions = mapper.readValue(aiResponse, new TypeReference<List<Question>>() {});
            if (questions == null) return new ArrayList<>();
            return questions;
        } catch (Exception ex) {
            throw new RuntimeException("Failed to parse AI response as JSON: " + ex.getMessage(), ex);
        }
    }

    /**
     * Score written answers for multiple players. Returns sorted list by average accuracy desc.
     */
    public List<PlayerResult> scoreSubmissions(List<PlayerSubmission> submissions) {
        List<PlayerResult> results = new ArrayList<>();

        for (PlayerSubmission ps : submissions) {
            double total = 0.0;
            int count = 0;
            if (ps.getAnswers() != null) {
                for (PlayerAnswer pa : ps.getAnswers()) {
                    int score = scoreSingleAnswer(pa.getReferenceAnswer(), pa.getAnswer());
                    total += score;
                    count++;
                }
            }

            PlayerResult pr = new PlayerResult();
            pr.setPlayerId(ps.getPlayerId());
            pr.setPlayerName(ps.getPlayerName());
            pr.setQuestionsCount(count);
            pr.setAverageScore(count == 0 ? 0.0 : (total / count));
            results.add(pr);
        }

        // sort descending by averageScore
        results.sort((a, b) -> Double.compare(b.getAverageScore(), a.getAverageScore()));
        return results;
    }

    /**
     * Score a single written answer against the reference using OpenAI. Returns 0-100.
     */
    private int scoreSingleAnswer(String reference, String answer) {
        if (reference == null) reference = "";
        if (answer == null) answer = "";

        // If no API key, use simple word-overlap heuristic
        if (openAiApiKey == null || openAiApiKey.trim().isEmpty()) {
            String[] refWords = reference.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
            String[] ansWords = answer.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
            java.util.Set<String> refSet = new java.util.HashSet<>();
            for (String w : refWords) if (!w.isBlank()) refSet.add(w);
            java.util.Set<String> ansSet = new java.util.HashSet<>();
            for (String w : ansWords) if (!w.isBlank()) ansSet.add(w);
            if (refSet.isEmpty()) return ansSet.isEmpty() ? 100 : 0;
            java.util.Set<String> intersection = new java.util.HashSet<>(refSet);
            intersection.retainAll(ansSet);
            double score = (intersection.size() * 100.0) / refSet.size();
            return (int) Math.round(Math.max(0, Math.min(100, score)));
        }

        try {
            String prompt = "You are an assistant that rates how correct a student's SHORT written answer is compared to a reference answer.\n" +
                    "Return ONLY an integer between 0 and 100 (0 = completely incorrect, 100 = fully correct).\n" +
                    "Reference: \"" + reference.replaceAll("\"", "\\\"") + "\"\n" +
                    "Student answer: \"" + answer.replaceAll("\"", "\\\"") + "\"\n" +
                    "Rate the correctness:";

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-3.5-turbo");

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> system = new HashMap<>();
            system.put("role", "system");
            system.put("content", "You are a concise grader that returns only a numeric score.");
            messages.add(system);

            Map<String, String> user = new HashMap<>();
            user.put("role", "user");
            user.put("content", prompt);
            messages.add(user);

            body.put("messages", messages);
            body.put("max_tokens", 10);
            body.put("temperature", 0.0);

            String resp = webClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> h.setBearerAuth(openAiApiKey))
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

            if (resp == null) return 0;
            JsonNode root = mapper.readTree(resp);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                JsonNode contentNode = choices.get(0).path("message").path("content");
                if (contentNode.isMissingNode()) contentNode = choices.get(0).path("text");
                String content = contentNode.asText();
                // Extract first integer 0-100
                java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d{1,3})").matcher(content);
                if (m.find()) {
                    int val = Integer.parseInt(m.group(1));
                    if (val < 0) val = 0;
                    if (val > 100) val = 100;
                    return val;
                }
            }
            return 0;
        } catch (Exception ex) {
            // On error, fallback to heuristic
            String[] refWords = reference.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
            String[] ansWords = answer.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
            java.util.Set<String> refSet = new java.util.HashSet<>();
            for (String w : refWords) if (!w.isBlank()) refSet.add(w);
            java.util.Set<String> ansSet = new java.util.HashSet<>();
            for (String w : ansWords) if (!w.isBlank()) ansSet.add(w);
            if (refSet.isEmpty()) return ansSet.isEmpty() ? 100 : 0;
            java.util.Set<String> intersection = new java.util.HashSet<>(refSet);
            intersection.retainAll(ansSet);
            double score = (intersection.size() * 100.0) / refSet.size();
            return (int) Math.round(Math.max(0, Math.min(100, score)));
        }
    }

    private String buildPrompt(QuizRequest req) {
        // If a custom prompt is provided by the frontend, use it but ensure the model returns strict JSON.
        if (req.getCustomPrompt() != null && !req.getCustomPrompt().trim().isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append(req.getCustomPrompt().trim()).append("\n\n");
            sb.append("IMPORTANT: Return ONLY a JSON array of question objects and nothing else (no prose, no numbering, no backticks).\n");
            sb.append("Each object must have keys: \"question\" (string), \"options\" (array of 4 strings), and \"correctAnswer\" (one of the option strings).\n");
            sb.append("Example format:\n");
            sb.append("[ { \"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correctAnswer\": \"A\" }, ... ]\n");
            return sb.toString();
        }

        String levelInstruction;
        switch (req.getDifficulty()) {
            case 0:
                levelInstruction = "Easy: create definition-based questions (straightforward facts).";
                break;
            case 1:
                levelInstruction = "Medium: create conceptual questions that test understanding.";
                break;
            default:
                levelInstruction = "Hard: create scenario-based questions requiring analysis.";
                break;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("You are an exam question generator.\n");
        sb.append("Generate exactly ").append(req.getCount()).append(" multiple-choice questions about '").append(req.getSubject()).append("'.\n");
        sb.append(levelInstruction).append("\n");
        sb.append("Each question must be an object with keys: \"question\" (string), \"options\" (array of 4 strings), and \"correctAnswer\" (one of the option strings).\n");
        sb.append("Return ONLY a JSON array of these objects and nothing else (no prose, no numbering, no backticks).\n");
        sb.append("Example format:\n");
        sb.append("[ { \"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correctAnswer\": \"A\" }, ... ]\n");
        sb.append("Ensure options are plausible distractors and that correctAnswer exactly matches one option.\n");
        sb.append("Do not include metadata keys.\n");

        return sb.toString();
    }

    /**
     * Call OpenAI Chat Completions API (gpt-3.5-turbo) and return the assistant message content.
     * If no API key is configured, fall back to a deterministic sample response.
     */
    private String callAiModel(String prompt, QuizRequest req) {
        if (openAiApiKey == null || openAiApiKey.trim().isEmpty()) {
            // Development fallback: deterministic sample data
            List<Question> sample = new ArrayList<>();
            for (int i = 1; i <= Math.max(1, req.getCount()); i++) {
                Question q = new Question();
                q.setQuestion(req.getSubject() + " sample question " + i + " (" + (req.getDifficulty()==0?"Easy":req.getDifficulty()==1?"Medium":"Hard") + ")");
                List<String> opts = new ArrayList<>();
                opts.add("Option A for Q" + i);
                opts.add("Option B for Q" + i);
                opts.add("Option C for Q" + i);
                opts.add("Option D for Q" + i);
                q.setOptions(opts);
                q.setCorrectAnswer(opts.get(0));
                sample.add(q);
            }

            try {
                return mapper.writeValueAsString(sample);
            } catch (Exception e) {
                return "[]";
            }
        }

        try {
            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-3.5-turbo");

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> system = new HashMap<>();
            system.put("role", "system");
            system.put("content", "You are a helpful assistant that outputs strict JSON only.");
            messages.add(system);

            Map<String, String> user = new HashMap<>();
            user.put("role", "user");
            user.put("content", prompt);
            messages.add(user);

            body.put("messages", messages);
            body.put("max_tokens", 1500);
            body.put("temperature", 0.2);

            String resp = webClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(h -> h.setBearerAuth(openAiApiKey))
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (resp == null) throw new RuntimeException("Empty response from OpenAI");

            // Parse assistant content from response
            JsonNode root = mapper.readTree(resp);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                JsonNode message = choices.get(0).path("message").path("content");
                if (message.isMissingNode()) message = choices.get(0).path("text");
                String content = message.asText();

                // Ensure we return only the JSON array part. If the model added text, try to extract first JSON array.
                int firstBracket = content.indexOf('[');
                int lastBracket = content.lastIndexOf(']');
                if (firstBracket >= 0 && lastBracket > firstBracket) {
                    return content.substring(firstBracket, lastBracket + 1).trim();
                }

                // Otherwise return full content and hope it's pure JSON
                return content.trim();
            }

            return "[]";
        } catch (Exception ex) {
            // On any error, fall back to deterministic sample to avoid total failure.
            List<Question> sample = new ArrayList<>();
            for (int i = 1; i <= Math.max(1, req.getCount()); i++) {
                Question q = new Question();
                q.setQuestion(req.getSubject() + " sample question " + i);
                List<String> opts = new ArrayList<>();
                opts.add("Option A for Q" + i);
                opts.add("Option B for Q" + i);
                opts.add("Option C for Q" + i);
                opts.add("Option D for Q" + i);
                q.setOptions(opts);
                q.setCorrectAnswer(opts.get(0));
                sample.add(q);
            }

            try {
                return mapper.writeValueAsString(sample);
            } catch (Exception e) {
                return "[]";
            }
        }
    }
}
