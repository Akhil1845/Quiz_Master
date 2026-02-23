package com.quizmaster.quizmaster.dto;

public class PlayerAnswer {
    private String questionId; // Can be numeric ID (as string) or string ID like "q1"
    private String referenceAnswer; // expected correct answer
    private String answer; // player's written answer

    public PlayerAnswer() {}

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }

    public String getReferenceAnswer() { return referenceAnswer; }
    public void setReferenceAnswer(String referenceAnswer) { this.referenceAnswer = referenceAnswer; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
}
