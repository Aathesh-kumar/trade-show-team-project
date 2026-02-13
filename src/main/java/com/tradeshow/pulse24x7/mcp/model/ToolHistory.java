package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class ToolHistory {
    private Integer toolId;
    private Boolean isAvailable;
    private Timestamp checkedAt;

    public ToolHistory() {
    }

    public ToolHistory(Integer toolId, Boolean isAvailable, Timestamp checkedAt) {
        this.toolId = toolId;
        this.isAvailable = isAvailable;
        this.checkedAt = checkedAt;
    }

    public Integer getToolId() {
        return toolId;
    }

    public void setToolId(Integer toolId) {
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