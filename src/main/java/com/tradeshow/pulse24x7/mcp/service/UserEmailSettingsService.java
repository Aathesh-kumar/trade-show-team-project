package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.UserEmailSettingsDAO;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;

import java.util.Locale;

public class UserEmailSettingsService {
    private final UserEmailSettingsDAO userEmailSettingsDAO;
    private final UserAuthService userAuthService;

    public UserEmailSettingsService() {
        this.userEmailSettingsDAO = new UserEmailSettingsDAO();
        this.userAuthService = new UserAuthService();
    }

    public UserEmailSettings getByUserId(Long userId) {
        if (userId == null || userId <= 0) {
            return null;
        }
        UserEmailSettings settings = userEmailSettingsDAO.findByUserId(userId);
        if (settings != null) {
            return normalize(settings, userAuthService.findById(userId));
        }
        User user = userAuthService.findById(userId);
        return defaultSettings(userId, user != null ? user.getEmail() : null);
    }

    public boolean save(UserEmailSettings settings) {
        if (settings == null || settings.getUserId() == null || settings.getUserId() <= 0) {
            return false;
        }
        User user = userAuthService.findById(settings.getUserId());
        UserEmailSettings normalized = normalize(settings, user);
        return userEmailSettingsDAO.upsert(normalized);
    }

    private UserEmailSettings normalize(UserEmailSettings settings, User user) {
        UserEmailSettings normalized = new UserEmailSettings();
        normalized.setUserId(settings.getUserId());
        normalized.setAlertsEnabled(settings.isAlertsEnabled());
        String fallbackEmail = user != null ? user.getEmail() : null;
        normalized.setReceiverEmail(resolveReceiverEmail(settings.getReceiverEmail(), fallbackEmail));
        normalized.setMinSeverity(resolveMinSeverity(settings.getMinSeverity()));
        normalized.setIncludeServerAlerts(settings.isIncludeServerAlerts());
        normalized.setIncludeToolAlerts(settings.isIncludeToolAlerts());
        normalized.setIncludeSystemAlerts(settings.isIncludeSystemAlerts());
        normalized.setUpdatedAt(settings.getUpdatedAt());
        return normalized;
    }

    private UserEmailSettings defaultSettings(Long userId, String userEmail) {
        UserEmailSettings settings = new UserEmailSettings();
        settings.setUserId(userId);
        settings.setAlertsEnabled(true);
        settings.setReceiverEmail(resolveReceiverEmail(null, userEmail));
        settings.setMinSeverity("warning");
        settings.setIncludeServerAlerts(true);
        settings.setIncludeToolAlerts(true);
        settings.setIncludeSystemAlerts(true);
        return settings;
    }

    private String resolveReceiverEmail(String requestedEmail, String userEmail) {
        if (requestedEmail != null && !requestedEmail.isBlank()) {
            return requestedEmail.trim().toLowerCase(Locale.ROOT);
        }
        return userEmail == null ? null : userEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveMinSeverity(String severity) {
        String value = severity == null ? "" : severity.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "info", "warning", "error", "critical" -> value;
            default -> "warning";
        };
    }
}
