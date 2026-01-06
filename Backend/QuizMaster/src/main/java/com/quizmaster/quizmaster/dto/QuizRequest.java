package com.quizmaster.quizmaster.dto;

public class QuizRequest {
    private String subject;
    private int difficulty; // 0=Easy,1=Medium,2=Hard
    private String questionType;
    private int count;
    private String customPrompt;

    public QuizRequest() {}

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public int getDifficulty() { return difficulty; }
    public void setDifficulty(int difficulty) { this.difficulty = difficulty; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public String getCustomPrompt() { return customPrompt; }
    public void setCustomPrompt(String customPrompt) { this.customPrompt = customPrompt; }
}
