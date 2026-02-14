package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class ServerHistory {
    private int serverId;
    private Boolean serverUp;
    private int toolCount;
    private Timestamp checkedAt;

    public ServerHistory() {
    }

    public ServerHistory(int serverId, Boolean serverUp, int toolCount, Timestamp checkedAt) {
        this.serverId = serverId;
        this.serverUp = serverUp;
        this.toolCount = toolCount;
        this.checkedAt = checkedAt;
    }

    public int getServerId() {
        return serverId;
    }

    public void setServerId(int serverId) {
        this.serverId = serverId;
    }

    public Boolean getServerUp() {
        return serverUp;
    }

    public void setServerUp(Boolean serverUp) {
        this.serverUp = serverUp;
    }

    public int getToolCount() {
        return toolCount;
    }

    public void setToolCount(int toolCount) {
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