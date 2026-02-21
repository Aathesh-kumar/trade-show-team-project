package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class AuthToken {
    private int serverId;
    private String headerType;
    private String accessToken;
    private String refreshToken;
    private Timestamp expiresAt;
    private String clientId;
    private String clientSecret;
    private String tokenEndpoint;
    private String oauthTokenLink;
    private Timestamp updatedAt;

    public AuthToken() {
    }

    public AuthToken(int serverId, String headerType, String accessToken, String refreshToken, Timestamp expiresAt,
                     String clientId, String clientSecret, String tokenEndpoint, String oauthTokenLink, Timestamp updatedAt) {
        this.serverId = serverId;
        this.headerType = headerType;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresAt = expiresAt;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.tokenEndpoint = tokenEndpoint;
        this.oauthTokenLink = oauthTokenLink;
        this.updatedAt = updatedAt;
    }

    public int getServerId() {
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    public String getHeaderType() {
        return headerType;
    }

    public void setHeaderType(String headerType) {
        this.headerType = headerType;
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

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getTokenEndpoint() {
        return tokenEndpoint;
    }

    public void setTokenEndpoint(String tokenEndpoint) {
        this.tokenEndpoint = tokenEndpoint;
    }

    public String getOauthTokenLink() {
        return oauthTokenLink;
    }

    public void setOauthTokenLink(String oauthTokenLink) {
        this.oauthTokenLink = oauthTokenLink;
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
                ", headerType='" + (headerType != null ? "***" : null) + '\'' +
                ", accessToken='" + (accessToken != null ? "***" : null) + '\'' +
                ", refreshToken='" + (refreshToken != null ? "***" : null) + '\'' +
                ", expiresAt=" + expiresAt +
                ", clientId='" + (clientId != null ? "***" : null) + '\'' +
                ", clientSecret='" + (clientSecret != null ? "***" : null) + '\'' +
                ", tokenEndpoint='" + tokenEndpoint + '\'' +
                ", oauthTokenLink='" + oauthTokenLink + '\'' +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
