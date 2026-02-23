package com.quizmaster.quizmaster.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

        // Use a supported Gemini model; change here if you prefer another model from the available list.
        private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=";

    public String generateQuestions(String prompt) {

        RestTemplate restTemplate = new RestTemplate();

        // Request body
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> parts = new HashMap<>();
        parts.put("parts", new Object[]{textPart});

        Map<String, Object> body = new HashMap<>();
        body.put("contents", new Object[]{parts});
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured (gemini.api.key). Set this in application.properties or env.");
        }

        try {
            System.out.println("Sending request to Gemini API...");
            System.out.println("API Key: " + (apiKey != null ? "[SET]" : "[MISSING]"));
            System.out.println("Request body: " + body);

            // Call Gemini API
            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_URL + apiKey,
                    body,
                    Map.class
            );

            System.out.println("Received response from Gemini API: " + response);

            if (response == null) {
                throw new RuntimeException("Received null response from Gemini API");
            }

            if (response.containsKey("error")) {
                throw new RuntimeException("Gemini API error: " + response.get("error"));
            }

            if (!response.containsKey("candidates")) {
                throw new RuntimeException("Invalid response format from Gemini API. Missing 'candidates' field. Response: " + response);
            }

            // Extract the generated text from the response
            try {
                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> candidates = (java.util.List<Map<String, Object>>) response.get("candidates");
                if (candidates == null || candidates.isEmpty()) {
                    throw new RuntimeException("No candidates in Gemini API response");
                }

                Map<String, Object> candidate = candidates.get(0);
                if (candidate == null) {
                    throw new RuntimeException("First candidate is null in Gemini API response");
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> content = (Map<String, Object>) candidate.get("content");
                if (content == null) {
                    throw new RuntimeException("Content is null in Gemini API response");
                }

                @SuppressWarnings("unchecked")
                java.util.List<Map<String, Object>> responseParts = (java.util.List<Map<String, Object>>) content.get("parts");
                
                if (responseParts == null || responseParts.isEmpty()) {
                    throw new RuntimeException("No content parts in Gemini API response");
                }
                
                String generatedText = (String) responseParts.get(0).get("text");
                if (generatedText == null || generatedText.trim().isEmpty()) {
                    throw new RuntimeException("Generated text is empty in Gemini API response");
                }
                
                return generatedText.trim();
            } catch (ClassCastException e) {
                throw new RuntimeException("Unexpected response format from Gemini API: " + e.getMessage() + ". Full response: " + response, e);
            }
        } catch (HttpClientErrorException.NotFound nf) {
            // Model not found - try to list available models to provide actionable info
            try {
                String listUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
                Map lm = restTemplate.getForObject(listUrl, Map.class);
                Object modelsObj = lm == null ? null : lm.get("models");
                StringBuilder sb = new StringBuilder();
                sb.append("Gemini model not found (404). Available models: ");
                if (modelsObj instanceof java.util.List) {
                    java.util.List list = (java.util.List) modelsObj;
                    for (Object o : list) {
                        if (o instanceof Map) {
                            Object name = ((Map)o).get("name");
                            if (name != null) sb.append(name.toString()).append(", ");
                        }
                    }
                } else {
                    sb.append("(could not retrieve model list)");
                }
                throw new RuntimeException(sb.toString());
            } catch (Exception ex2) {
                throw new RuntimeException("Gemini model not found and failed to list models: " + ex2.getMessage(), nf);
            }
        } catch (Exception ex) {
            throw new RuntimeException("Failed calling Gemini API: " + ex.getMessage(), ex);
        }
    }

    public int evaluateWrittenAnswer(String question, String referenceAnswer, String participantAnswer) {
        if (referenceAnswer == null || referenceAnswer.trim().isEmpty() || 
            participantAnswer == null || participantAnswer.trim().isEmpty()) {
            return 0;
        }

        RestTemplate restTemplate = new RestTemplate();

        // Create a prompt for AI to evaluate the answer accuracy
        String evaluationPrompt = String.format(
            "You are an educational assessment expert. Evaluate the following written answer on a scale of 0-100.\n\n" +
            "Question: %s\n" +
            "Expected Answer: %s\n" +
            "Student Answer: %s\n\n" +
            "Provide ONLY a single number (0-100) representing the accuracy percentage. " +
            "Consider if the student's answer captures the key concepts even if worded differently. " +
            "Give full marks (100) only if the answer is essentially correct. " +
            "Consider partial credit for answers that show understanding but miss some details.",
            question.trim(), referenceAnswer.trim(), participantAnswer.trim()
        );

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", evaluationPrompt);

        Map<String, Object> parts = new HashMap<>();
        parts.put("parts", new Object[]{textPart});

        Map<String, Object> body = new HashMap<>();
        body.put("contents", new Object[]{parts});

        try {
            System.out.println("[AI-EVAL] Evaluating written answer...");
            
            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_URL + apiKey,
                    body,
                    Map.class
            );

            if (response == null || !response.containsKey("candidates")) {
                System.out.println("[AI-EVAL] Invalid response format, returning 0");
                return 0;
            }

            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> candidates = (java.util.List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                return 0;
            }

            Map<String, Object> candidate = candidates.get(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidate.get("content");
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> responseParts = (java.util.List<Map<String, Object>>) content.get("parts");
            
            String aiResponse = (String) responseParts.get(0).get("text");
            if (aiResponse != null) {
                // Extract the numeric accuracy from the AI response
                aiResponse = aiResponse.trim().replaceAll("[^0-9]", "");
                if (!aiResponse.isEmpty()) {
                    int accuracy = Integer.parseInt(aiResponse);
                    // Ensure accuracy is between 0 and 100
                    accuracy = Math.max(0, Math.min(100, accuracy));
                    System.out.println("[AI-EVAL] Accuracy score: " + accuracy + "%");
                    return accuracy;
                }
            }
            return 0;
        } catch (Exception ex) {
            System.out.println("[AI-EVAL] Error evaluating answer: " + ex.getMessage());
            return 0;
        }
    }
}
