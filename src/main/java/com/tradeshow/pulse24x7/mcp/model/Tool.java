package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class Tool {
    private Integer toolId;
    private String toolName;
    private String toolDescription;
    private Boolean isAvailability;
    private Timestamp createAt;
    private Timestamp lastModify;
    private Integer serverId;

    public Tool() {
    }

    public Tool(Integer toolId, String toolName, String toolDescription, Boolean isAvailability,
                Timestamp createAt, Timestamp lastModify, Integer serverId) {
        this.toolId = toolId;
        this.toolName = toolName;
        this.toolDescription = toolDescription;
        this.isAvailability = isAvailability;
        this.createAt = createAt;
        this.lastModify = lastModify;
        this.serverId = serverId;
    }

    public Integer getToolId() {
        return toolId;
    }

    public void setToolId(Integer toolId) {
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

    public Boolean getIsAvailability() {
        return isAvailability;
    }

    public void setIsAvailability(Boolean isAvailability) {
        this.isAvailability = isAvailability;
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

    public Integer getServerId() {
        return serverId;
    }

    public void setServerId(Integer serverId) {
        this.serverId = serverId;
    }

    @Override
    public String toString() {
        return "Tool{" +
                "toolId=" + toolId +
                ", toolName='" + toolName + '\'' +
                ", toolDescription='" + toolDescription + '\'' +
                ", isAvailability=" + isAvailability +
                ", createAt=" + createAt +
                ", lastModify=" + lastModify +
                ", serverId=" + serverId +
                '}';
    }
}