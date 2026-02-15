package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class RequestLog {
    private Long logId;
    private Integer serverId;
    private Integer toolId;
    private String method;
    private String endpoint;
    private Integer statusCode;
    private String statusText;
    private String requestPayload;
    private String responseBody;
    private Integer latencyMs;
    private Double responseSizeKb;
    private Timestamp timestamp;
    private String errorMessage;
    
    // Tool and Server names for joined queries
    private String toolName;
    private String serverName;

    // Constructors
    public RequestLog() {}

    public RequestLog(Integer serverId, Integer toolId, String method, String endpoint, 
                     Integer statusCode, String statusText, Integer latencyMs, 
                     Double responseSizeKb, String requestPayload, String responseBody) {
        this.serverId = serverId;
        this.toolId = toolId;
        this.method = method;
        this.endpoint = endpoint;
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.latencyMs = latencyMs;
        this.responseSizeKb = responseSizeKb;
        this.requestPayload = requestPayload;
        this.responseBody = responseBody;
    }

    // Getters and Setters
    public Long getLogId() {
        return logId;
    }

    public void setLogId(Long logId) {
        this.logId = logId;
    }

    public Integer getServerId() {
        return serverId;
    }

    public void setServerId(Integer serverId) {
        this.serverId = serverId;
    }

    public Integer getToolId() {
        return toolId;
    }

    public void setToolId(Integer toolId) {
        this.toolId = toolId;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(Integer statusCode) {
        this.statusCode = statusCode;
    }

    public String getStatusText() {
        return statusText;
    }

    public void setStatusText(String statusText) {
        this.statusText = statusText;
    }

    public String getRequestPayload() {
        return requestPayload;
    }

    public void setRequestPayload(String requestPayload) {
        this.requestPayload = requestPayload;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public void setResponseBody(String responseBody) {
        this.responseBody = responseBody;
    }

    public Integer getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(Integer latencyMs) {
        this.latencyMs = latencyMs;
    }

    public Double getResponseSizeKb() {
        return responseSizeKb;
    }

    public void setResponseSizeKb(Double responseSizeKb) {
        this.responseSizeKb = responseSizeKb;
    }

    public Timestamp getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Timestamp timestamp) {
        this.timestamp = timestamp;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getToolName() {
        return toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public String getServerName() {
        return serverName;
    }

    public void setServerName(String serverName) {
        this.serverName = serverName;
    }

    // Validation
    public boolean isValid() {
        return serverId != null && serverId > 0 
            && method != null && !method.trim().isEmpty()
            && endpoint != null && !endpoint.trim().isEmpty()
            && statusCode != null && statusCode >= 100 && statusCode < 600;
    }

    @Override
    public String toString() {
        return "RequestLog{" +
                "logId=" + logId +
                ", serverId=" + serverId +
                ", toolId=" + toolId +
                ", method='" + method + '\'' +
                ", endpoint='" + endpoint + '\'' +
                ", statusCode=" + statusCode +
                ", latencyMs=" + latencyMs +
                ", timestamp=" + timestamp +
                '}';
    }
}