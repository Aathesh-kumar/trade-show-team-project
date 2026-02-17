package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class Tool {
    private int toolId;
    private String toolName;
    private String toolDescription;
    private String toolType;
    private String inputSchema;
    private String outputSchema;
    private Boolean isAvailability;
    private Integer totalRequests;
    private Integer successRequests;
    private Integer lastStatusCode;
    private Long lastLatencyMs;
    private Timestamp createAt;
    private Timestamp lastModify;
    private int serverId;

    public Tool() {
    }

    public Tool(int toolId, String toolName, String toolDescription, String toolType, String inputSchema,
                String outputSchema, Boolean isAvailability, Integer totalRequests, Integer successRequests,
                Integer lastStatusCode, Long lastLatencyMs, Timestamp createAt, Timestamp lastModify, int serverId) {
        this.toolId = toolId;
        this.toolName = toolName;
        this.toolDescription = toolDescription;
        this.toolType = toolType;
        this.inputSchema = inputSchema;
        this.outputSchema = outputSchema;
        this.isAvailability = isAvailability;
        this.totalRequests = totalRequests;
        this.successRequests = successRequests;
        this.lastStatusCode = lastStatusCode;
        this.lastLatencyMs = lastLatencyMs;
        this.createAt = createAt;
        this.lastModify = lastModify;
        this.serverId = serverId;
    }

    public int getToolId() {
        return toolId;
    }

    public void setToolId(int toolId) {
        this.toolId = toolId;
    }

    public String getToolName() {
        return toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public String getToolDescription() {
        return toolDescription;
    }

    public void setToolDescription(String toolDescription) {
        this.toolDescription = toolDescription;
    }

    public String getToolType() {
        return toolType;
    }

    public void setToolType(String toolType) {
        this.toolType = toolType;
    }

    public String getInputSchema() {
        return inputSchema;
    }

    public void setInputSchema(String inputSchema) {
        this.inputSchema = inputSchema;
    }

    public String getOutputSchema() {
        return outputSchema;
    }

    public void setOutputSchema(String outputSchema) {
        this.outputSchema = outputSchema;
    }

    public Boolean getIsAvailability() {
        return isAvailability;
    }

    public void setIsAvailability(Boolean isAvailability) {
        this.isAvailability = isAvailability;
    }

    public Integer getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Integer totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Integer getSuccessRequests() {
        return successRequests;
    }

    public void setSuccessRequests(Integer successRequests) {
        this.successRequests = successRequests;
    }

    public Integer getLastStatusCode() {
        return lastStatusCode;
    }

    public void setLastStatusCode(Integer lastStatusCode) {
        this.lastStatusCode = lastStatusCode;
    }

    public Long getLastLatencyMs() {
        return lastLatencyMs;
    }

    public void setLastLatencyMs(Long lastLatencyMs) {
        this.lastLatencyMs = lastLatencyMs;
    }

    public Timestamp getCreateAt() {
        return createAt;
    }

    public void setCreateAt(Timestamp createAt) {
        this.createAt = createAt;
    }

    public Timestamp getLastModify() {
        return lastModify;
    }

    public void setLastModify(Timestamp lastModify) {
        this.lastModify = lastModify;
    }

    public int getServerId() {
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    @Override
    public String toString() {
        return "Tool{" +
                "toolId=" + toolId +
                ", toolName='" + toolName + '\'' +
                ", toolDescription='" + toolDescription + '\'' +
                ", toolType='" + toolType + '\'' +
                ", inputSchema='" + inputSchema + '\'' +
                ", outputSchema='" + outputSchema + '\'' +
                ", isAvailability=" + isAvailability +
                ", totalRequests=" + totalRequests +
                ", successRequests=" + successRequests +
                ", lastStatusCode=" + lastStatusCode +
                ", lastLatencyMs=" + lastLatencyMs +
                ", createAt=" + createAt +
                ", lastModify=" + lastModify +
                ", serverId=" + serverId +
                '}';
    }
}
