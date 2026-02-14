package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class AuthToken {
    private int serverId;
    private String accessToken;
    private String refreshToken;
    private Timestamp expiresAt;
    private Timestamp updatedAt;

    public AuthToken() {
    }

    public AuthToken(int serverId, String accessToken, String refreshToken,
                     Timestamp expiresAt, Timestamp updatedAt) {
        this.serverId = serverId;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
        this.updatedAt = updatedAt;
    }

    public int getServerId() {
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public Timestamp getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Timestamp expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public String toString() {
        return "AuthToken{" +
                "serverId=" + serverId +
                ", accessToken='" + (accessToken != null ? "***" : null) + '\'' +
                ", refreshToken='" + (refreshToken != null ? "***" : null) + '\'' +
                ", expiresAt=" + expiresAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
