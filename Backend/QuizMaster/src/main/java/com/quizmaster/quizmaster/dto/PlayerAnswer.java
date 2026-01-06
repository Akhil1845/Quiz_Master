package com.quizmaster.quizmaster.dto;

public class PlayerAnswer {
    private Long questionId;
    private String referenceAnswer; // expected correct answer
    private String answer; // player's written answer

    public PlayerAnswer() {}

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public String getReferenceAnswer() { return referenceAnswer; }
    public void setReferenceAnswer(String referenceAnswer) { this.referenceAnswer = referenceAnswer; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
}
