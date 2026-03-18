package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.UserEmailSettingsDAO;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public class UserEmailSettingsService {
    private final UserEmailSettingsDAO userEmailSettingsDAO;
    private final UserAuthService userAuthService;
    private static final Pattern SIMPLE_EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    public UserEmailSettingsService() {
        this.userEmailSettingsDAO = new UserEmailSettingsDAO();
        this.userAuthService = new UserAuthService();
    }

    public UserEmailSettings getByUserId(Long userId) {
        Long effectiveUserId = (userId == null || userId <= 0) ? null : userId;
        User user = effectiveUserId == null ? null : userAuthService.findById(effectiveUserId);
        if (effectiveUserId != null) {
            UserEmailSettings byUser = userEmailSettingsDAO.findByUserId(effectiveUserId);
            if (byUser != null) {
                UserEmailSettings normalized = normalize(byUser, user);
                normalized.setUserId(effectiveUserId);
                return normalized;
            }
        }
        return defaultSettings(effectiveUserId, user != null ? user.getEmail() : null);
    }

    public boolean save(UserEmailSettings settings) {
        if (settings == null) {
            return false;
        }
        Long userId = settings.getUserId();
        if (userId == null || userId <= 0) {
            userId = 1L;
        }
        settings.setUserId(userId);
        User user = userAuthService.findById(userId);
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
        String normalizedRequested = normalizeEmailListOrNull(requestedEmail);
        if (normalizedRequested != null && !normalizedRequested.isBlank()) {
            return normalizedRequested;
        }
        return normalizeEmailListOrNull(userEmail);
    }

    static String normalizeEmailListOrNull(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim();
        if (value.isBlank()) {
            return null;
        }
        String[] parts = value.split(",");
        Set<String> unique = new LinkedHashSet<>();
        java.util.List<String> invalid = new ArrayList<>();
        for (String part : parts) {
            if (part == null) {
                continue;
            }
            String email = part.trim().toLowerCase(Locale.ROOT);
            if (email.isBlank()) {
                continue;
            }
            if (!SIMPLE_EMAIL.matcher(email).matches()) {
                invalid.add(email);
                continue;
            }
            unique.add(email);
        }
        if (!invalid.isEmpty()) {
            throw new IllegalArgumentException("Invalid receiver email(s): " + String.join(", ", invalid));
        }
        if (unique.isEmpty()) {
            return null;
        }
        return String.join(", ", unique);
    }

    private String resolveMinSeverity(String severity) {
        String value = severity == null ? "" : severity.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "info", "warning", "error", "critical" -> value;
            default -> "warning";
        };
    }
}
