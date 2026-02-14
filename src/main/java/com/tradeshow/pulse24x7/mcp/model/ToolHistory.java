package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class ToolHistory {
    private int toolId;
    private Boolean isAvailable;
    private Timestamp checkedAt;

    public ToolHistory() {
    }

    public ToolHistory(int toolId, Boolean isAvailable, Timestamp checkedAt) {
        this.toolId = toolId;
        this.isAvailable = isAvailable;
        this.checkedAt = checkedAt;
    }

    public int getToolId() {
        return toolId;
    }

    public void setToolId(int toolId) {
        this.toolId = toolId;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean isAvailable) {
        this.isAvailable = isAvailable;
    }

    public Timestamp getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(Timestamp checkedAt) {
        this.checkedAt = checkedAt;
    }

    @Override
    public String toString() {
        return "ToolHistory{" +
                "toolId=" + toolId +
                ", isAvailable=" + isAvailable +
                ", checkedAt=" + checkedAt +
                '}';
    }
}