package com.quizmaster.quizmaster.dto;

public class GoogleAuthRequest {

    private String token;
    private boolean signup;
    private String email;
    private String username;
    private String provider;

    // No-arg constructor (IMPORTANT)
    public GoogleAuthRequest() {
    }

    // Getters & Setters

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public boolean isSignup() {
        return signup;
    }

    public void setSignup(boolean signup) {
        this.signup = signup;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }
}
