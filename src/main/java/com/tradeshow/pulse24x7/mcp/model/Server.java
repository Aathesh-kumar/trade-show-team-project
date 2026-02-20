package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class Server {
    private int serverId;
    private Long userId;
    private String serverName;
    private String serverUrl;
    private Timestamp createdAt;

    public Server() {
    }

    public Server(int serverId, Long userId, String serverName, String serverUrl, Timestamp createdAt) {
        this.serverId = serverId;
        this.userId = userId;
        this.serverName = serverName;
        this.serverUrl = serverUrl;
        this.createdAt = createdAt;
    }

    public int getServerId() {
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getServerName() {
        return serverName;
    }

    public void setServerName(String serverName) {
        this.serverName = serverName;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "Server{" +
                "serverId=" + serverId +
                ", userId=" + userId +
                ", serverName='" + serverName + '\'' +
                ", serverUrl='" + serverUrl + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
