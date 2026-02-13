package com.tradeshow.pulse24x7.mcp.model;

public class ToolHistory {
    String toolName;
    boolean availability;
    String checkedTime;

    public ToolHistory(String toolName, boolean availability, String checkedTime) {
        this.toolName = toolName;
        this.availability = availability;
        this.checkedTime = checkedTime;
    }

    public String getToolName() {
        return toolName;
    }

    public void setToolName(String toolName) {
        this.toolName = toolName;
    }

    public boolean isAvailability() {
        return availability;
    }

    public void setAvailability(boolean availability) {
        this.availability = availability;
    }

    public String getCheckedTime() {
        return checkedTime;
    }

    public void setCheckedTime(String checkedTime) {
        this.checkedTime = checkedTime;
    }
}
