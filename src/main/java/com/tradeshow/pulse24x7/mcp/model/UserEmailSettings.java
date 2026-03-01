package com.tradeshow.pulse24x7.mcp.model;

import java.sql.Timestamp;

public class UserEmailSettings {
    private Long userId;
    private boolean alertsEnabled;
    private String receiverEmail;
    private String minSeverity;
    private boolean includeServerAlerts;
    private boolean includeToolAlerts;
    private boolean includeSystemAlerts;
    private Timestamp updatedAt;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isAlertsEnabled() {
        return alertsEnabled;
    }

    public void setAlertsEnabled(boolean alertsEnabled) {
        this.alertsEnabled = alertsEnabled;
    }

    public String getReceiverEmail() {
        return receiverEmail;
    }

    public void setReceiverEmail(String receiverEmail) {
        this.receiverEmail = receiverEmail;
    }

    public String getMinSeverity() {
        return minSeverity;
    }

    public void setMinSeverity(String minSeverity) {
        this.minSeverity = minSeverity;
    }

    public boolean isIncludeServerAlerts() {
        return includeServerAlerts;
    }

    public void setIncludeServerAlerts(boolean includeServerAlerts) {
        this.includeServerAlerts = includeServerAlerts;
    }

    public boolean isIncludeToolAlerts() {
        return includeToolAlerts;
    }

    public void setIncludeToolAlerts(boolean includeToolAlerts) {
        this.includeToolAlerts = includeToolAlerts;
    }

    public boolean isIncludeSystemAlerts() {
        return includeSystemAlerts;
    }

    public void setIncludeSystemAlerts(boolean includeSystemAlerts) {
        this.includeSystemAlerts = includeSystemAlerts;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }
}
