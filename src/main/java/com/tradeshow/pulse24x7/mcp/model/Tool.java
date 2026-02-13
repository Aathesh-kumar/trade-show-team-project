package com.tradeshow.pulse24x7.mcp.model;

public class Tool {
    private String toolName;
    private String toolDescription;
    private boolean availability;
    private String createdTime;
    private String lastModifyTime;

    public Tool(String toolName, String toolDescription, boolean availability, String createdTime, String lastModifyTime) {
        this.toolName = toolName;
        this.toolDescription = toolDescription;
        this.availability = availability;
        this.createdTime = createdTime;
        this.lastModifyTime = lastModifyTime;
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

    public boolean isAvailability() {
        return availability;
    }

    public void setAvailability(boolean availability) {
        this.availability = availability;
    }

    public String getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(String createdTime) {
        this.createdTime = createdTime;
    }

    public String getLastModifyTime() {
        return lastModifyTime;
    }

    public void setLastModifyTime(String lastModifyTime) {
        this.lastModifyTime = lastModifyTime;
    }
}
