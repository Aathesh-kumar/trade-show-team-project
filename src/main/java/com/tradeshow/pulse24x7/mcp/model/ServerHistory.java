package com.tradeshow.pulse24x7.mcp.model;

public class ServerHistory {
    boolean availability;
    int toolCount;
    String checkedTime;

    public ServerHistory(boolean availability, int toolCount, String checkedTime) {
        this.availability = availability;
        this.toolCount = toolCount;
        this.checkedTime = checkedTime;
    }

    public boolean isAvailability() {
        return availability;
    }

    public void setAvailability(boolean availability) {
        this.availability = availability;
    }

    public int getToolCount() {
        return toolCount;
    }

    public void setToolCount(int toolCount) {
        this.toolCount = toolCount;
    }

    public String getCheckedTime() {
        return checkedTime;
    }

    public void setCheckedTime(String checkedTime) {
        this.checkedTime = checkedTime;
    }
}
