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
}
