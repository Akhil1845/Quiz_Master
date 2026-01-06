package com.quizmaster.quizmaster.dto;

import java.util.List;

public class PlayerSubmission {
    private String playerId;
    private String playerName;
    private List<PlayerAnswer> answers;

    public PlayerSubmission() {}

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getPlayerName() { return playerName; }
    public void setPlayerName(String playerName) { this.playerName = playerName; }

    public List<PlayerAnswer> getAnswers() { return answers; }
    public void setAnswers(List<PlayerAnswer> answers) { this.answers = answers; }
}
