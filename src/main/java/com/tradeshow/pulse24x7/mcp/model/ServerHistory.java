package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class ServerHistory {
    private Integer serverId;
    private Boolean serverUp;
    private Integer toolCount;
    private Timestamp checkedAt;

    public ServerHistory() {
    }

    public ServerHistory(Integer serverId, Boolean serverUp, Integer toolCount, Timestamp checkedAt) {
        this.serverId = serverId;
        this.serverUp = serverUp;
        this.toolCount = toolCount;
        this.checkedAt = checkedAt;
    }

    public Integer getServerId() {
        return serverId;
    }

    public void setServerId(Integer serverId) {
        this.serverId = serverId;
    }

    public Boolean getServerUp() {
        return serverUp;
    }

    public void setServerUp(Boolean serverUp) {
        this.serverUp = serverUp;
    }

    public Integer getToolCount() {
        return toolCount;
    }

    public void setToolCount(Integer toolCount) {
        this.toolCount = toolCount;
    }

    public Timestamp getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(Timestamp checkedAt) {
        this.checkedAt = checkedAt;
    }

    @Override
    public String toString() {
        return "ServerHistory{" +
                "serverId=" + serverId +
                ", serverUp=" + serverUp +
                ", toolCount=" + toolCount +
                ", checkedAt=" + checkedAt +
                '}';
    }
}