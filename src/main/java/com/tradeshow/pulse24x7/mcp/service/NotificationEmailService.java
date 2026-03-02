package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.model.Notification;
import com.tradeshow.pulse24x7.mcp.model.NotificationRecipient;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Properties;

public class NotificationEmailService {
    private static final Logger logger = LogManager.getLogger(NotificationEmailService.class);
    private static final DateTimeFormatter EMAIL_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z", Locale.ROOT).withZone(ZoneId.systemDefault());

    public boolean send(Notification notification, NotificationRecipient recipient, UserEmailSettings settings) {
        if (notification == null || recipient == null || settings == null) {
            return false;
        }
        if (!settings.isAlertsEnabled()) {
            return true;
        }
        String toEmail = normalizeEmail(settings.getReceiverEmail());
        if (toEmail == null || toEmail.isBlank()) {
            return false;
        }
        if (!isCategoryEnabled(notification.getCategory(), settings)) {
            return true;
        }
        if (!passesSeverityThreshold(notification.getSeverity(), settings.getMinSeverity())) {
            return true;
        }

        MailboxProfile mailbox = selectMailboxProfile(toEmail);
        if (mailbox.password == null || mailbox.password.isBlank()) {
            logger.warn("Skipping email alert: sender password missing for {}", mailbox.fromEmail);
            return false;
        }

        try {
            return sendHtml(
                    toEmail,
                    "Pulse24x7 Alerts",
                    buildSubject(notification),
                    buildAlertHtml(notification, recipient),
                    mailbox
            );
        } catch (Exception e) {
            logger.error("Failed to send email alert to {}", toEmail, e);
            return false;
        }
    }

    public boolean sendPasswordResetTotp(String toEmail, String fullName, String totpCode, int validMinutes) {
        String normalizedEmail = normalizeEmail(toEmail);
        if (normalizedEmail == null || normalizedEmail.isBlank() || totpCode == null || totpCode.isBlank()) {
            return false;
        }
        MailboxProfile mailbox = selectMailboxProfile(normalizedEmail);
        if (mailbox.password == null || mailbox.password.isBlank()) {
            logger.warn("Skipping password reset email: sender password missing for {}", mailbox.fromEmail);
            return false;
        }
        String safeName = escapeHtml(normalizeText(fullName, "User"));
        String expiresAt = EMAIL_TIME_FORMAT.format(ZonedDateTime.now().plusMinutes(Math.max(1, validMinutes)).toInstant());
        String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\" />"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />"
                + "</head><body style=\"margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#172b4d;\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 12px;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:620px;background:#ffffff;border-radius:16px;border:1px solid #dfe6f3;overflow:hidden;\">"
                + "<tr><td style=\"background:linear-gradient(120deg,#0d3b66,#1d6fa5);padding:18px 20px;color:#ffffff;\">"
                + "<h1 style=\"margin:0;font-size:20px;\">Pulse24x7 Account Recovery</h1>"
                + "<p style=\"margin:6px 0 0;opacity:0.92;font-size:13px;\">One-time verification code for password reset</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:20px;\">"
                + "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6;\">Dear " + safeName + ",</p>"
                + "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6;\">We received a request to reset your Pulse24x7 account password.</p>"
                + "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6;\">Use the following TOTP verification code to continue:</p>"
                + "<div style=\"margin:14px 0 16px;padding:14px 16px;border-radius:12px;background:#edf5ff;border:1px solid #cfe0f7;text-align:center;\">"
                + "<span style=\"font-size:28px;letter-spacing:0.3em;font-weight:700;color:#0f2a43;\">" + escapeHtml(totpCode) + "</span>"
                + "</div>"
                + "<p style=\"margin:0 0 10px;font-size:13px;color:#334e68;\">This code is valid for " + validMinutes + " minutes and expires at " + escapeHtml(expiresAt) + ".</p>"
                + "<p style=\"margin:0 0 10px;font-size:13px;color:#334e68;\">If you did not request this action, please ignore this email. Your password will remain unchanged.</p>"
                + "<p style=\"margin:14px 0 0;font-size:12px;color:#5e718a;\">For your security, do not share this code with anyone.</p>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr></table></body></html>";

        return sendHtml(
                normalizedEmail,
                "Pulse24x7 Security",
                "[Pulse24x7] Password Reset Verification Code",
                html,
                mailbox
        );
    }

    private MailboxProfile selectMailboxProfile(String receiverEmail) {
        if (isZohoUser(receiverEmail)) {
            return new MailboxProfile(
                    env("MCP_MAIL_ZOHO_FROM", "pulse24x7@zohomail.in"),
                    env("MCP_MAIL_ZOHO_PASSWORD", ""),
                    env("MCP_MAIL_ZOHO_HOST", "smtp.zoho.in"),
                    parsePort(env("MCP_MAIL_ZOHO_PORT", "465"), 465)
            );
        }
        return new MailboxProfile(
                env("MCP_MAIL_GMAIL_FROM", "pulse24x7@gmail.com"),
                env("MCP_MAIL_GMAIL_PASSWORD", ""),
                env("MCP_MAIL_GMAIL_HOST", "smtp.gmail.com"),
                parsePort(env("MCP_MAIL_GMAIL_PORT", "465"), 465)
        );
    }

    private boolean isZohoUser(String email) {
        String lower = normalizeEmail(email);
        if (lower == null) {
            return false;
        }
        return lower.endsWith("@zoho.com")
                || lower.endsWith("@zoho.in")
                || lower.endsWith("@zohomail.in")
                || lower.endsWith("@zohocorp.com");
    }

    private String buildSubject(Notification notification) {
        String severity = normalizeLower(notification.getSeverity(), "info").toUpperCase(Locale.ROOT);
        return "[Pulse24x7][" + severity + "] " + normalizeText(notification.getTitle(), "Notification");
    }

    private String buildAlertHtml(Notification notification, NotificationRecipient recipient) {
        String severity = normalizeLower(notification.getSeverity(), "info").toUpperCase(Locale.ROOT);
        String category = normalizeLower(notification.getCategory(), "system");
        String title = escapeHtml(normalizeText(notification.getTitle(), "Notification"));
        String details = escapeHtml(normalizeText(notification.getMessage(), ""));
        String userName = escapeHtml(normalizeText(recipient.getFullName(), "User"));
        String createdAt = formatCreatedAt(notification.getCreatedAt());
        String badgeColor = resolveSeverityColor(severity);

        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\" />"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />"
                + "</head><body style=\"margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#172b4d;\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:22px 12px;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#ffffff;border-radius:16px;border:1px solid #dfe6f3;overflow:hidden;\">"
                + "<tr><td style=\"background:linear-gradient(120deg,#0d3b66,#1d6fa5);padding:18px 20px;color:#ffffff;\">"
                + "<h1 style=\"margin:0;font-size:20px;\">Pulse24x7 Alert Center</h1>"
                + "<p style=\"margin:6px 0 0;opacity:0.92;font-size:13px;\">Formal server monitoring notification</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:20px;\">"
                + "<p style=\"margin:0 0 12px;font-size:14px;\">Dear " + userName + ",</p>"
                + "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.5;\">A new notification has been generated in your Pulse24x7 monitoring workspace.</p>"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border:1px solid #e5ecf8;border-radius:12px;background:#f8fbff;\">"
                + "<tr><td style=\"padding:14px 14px 4px;\">"
                + "<span style=\"display:inline-block;padding:4px 10px;border-radius:999px;background:" + badgeColor + ";color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.03em;\">"
                + severity + "</span>"
                + "</td></tr>"
                + "<tr><td style=\"padding:8px 14px 0;\"><h2 style=\"margin:0;font-size:18px;color:#0f2a43;\">" + title + "</h2></td></tr>"
                + "<tr><td style=\"padding:10px 14px 14px;\"><p style=\"margin:0;font-size:14px;line-height:1.6;color:#244262;white-space:pre-wrap;\">" + details + "</p></td></tr>"
                + "</table>"
                + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin-top:14px;border-collapse:collapse;\">"
                + row("Category", escapeHtml(category))
                + row("Created At", escapeHtml(createdAt))
                + row("Notification ID", String.valueOf(notification.getId() == null ? "-" : notification.getId()))
                + "</table>"
                + "<p style=\"margin:16px 0 0;font-size:12px;color:#5e718a;\">You can manage email alert preferences in Settings > Email Alerts.</p>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr></table></body></html>";
    }

    private String row(String label, String value) {
        return "<tr>"
                + "<td style=\"padding:8px 0 6px;font-size:12px;color:#6b7f97;width:140px;\">" + label + "</td>"
                + "<td style=\"padding:8px 0 6px;font-size:13px;color:#1b3550;\">" + value + "</td>"
                + "</tr>";
    }

    private String formatCreatedAt(Timestamp createdAt) {
        if (createdAt == null) {
            return "-";
        }
        return EMAIL_TIME_FORMAT.format(createdAt.toInstant());
    }

    private String resolveSeverityColor(String severityUpper) {
        return switch (severityUpper) {
            case "ERROR", "CRITICAL" -> "#c62828";
            case "WARNING" -> "#ef6c00";
            default -> "#1565c0";
        };
    }

    private boolean isCategoryEnabled(String category, UserEmailSettings settings) {
        String normalized = normalizeLower(category, "system");
        return switch (normalized) {
            case "server" -> settings.isIncludeServerAlerts();
            case "tools", "tool" -> settings.isIncludeToolAlerts();
            default -> settings.isIncludeSystemAlerts();
        };
    }

    private boolean passesSeverityThreshold(String severity, String threshold) {
        return severityRank(severity) >= severityRank(threshold);
    }

    private int severityRank(String severity) {
        return switch (normalizeLower(severity, "info")) {
            case "critical" -> 4;
            case "error" -> 3;
            case "warning" -> 2;
            default -> 1;
        };
    }

    private String normalizeLower(String value, String fallback) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? fallback : normalized;
    }

    private String normalizeText(String value, String fallback) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? fallback : normalized;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String value = email.trim().toLowerCase(Locale.ROOT);
        return value.isBlank() ? null : value;
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String env(String key, String fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private int parsePort(String value, int fallback) {
        try {
            return Integer.parseInt(value);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private boolean sendHtml(String toEmail, String personalName, String subject, String htmlBody, MailboxProfile mailbox) {
        try {
            Session session = Session.getInstance(mailbox.smtpProperties(), new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(mailbox.fromEmail, mailbox.password);
                }
            });
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(mailbox.fromEmail, personalName));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
            message.setSubject(subject);
            message.setContent(htmlBody, "text/html; charset=UTF-8");
            Transport.send(message);
            return true;
        } catch (Exception ex) {
            logger.error("Failed to send email to {}", toEmail, ex);
            return false;
        }
    }

    private static class MailboxProfile {
        private final String fromEmail;
        private final String password;
        private final String host;
        private final int port;

        private MailboxProfile(String fromEmail, String password, String host, int port) {
            this.fromEmail = fromEmail;
            this.password = password;
            this.host = host;
            this.port = port;
        }

        private Properties smtpProperties() {
            Properties props = new Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.host", host);
            props.put("mail.smtp.port", String.valueOf(port));
            props.put("mail.smtp.ssl.enable", "true");
            return props;
        }
    }
}
