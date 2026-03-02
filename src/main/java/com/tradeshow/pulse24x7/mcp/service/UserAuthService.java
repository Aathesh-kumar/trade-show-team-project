package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.UserDAO;
import com.tradeshow.pulse24x7.mcp.dao.PasswordResetCodeDAO;
import com.tradeshow.pulse24x7.mcp.dao.UserEmailSettingsDAO;
import com.tradeshow.pulse24x7.mcp.model.PasswordResetCode;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;

public class UserAuthService {
    private static final Logger logger = LogManager.getLogger(UserAuthService.class);
    private static final Properties localZohoConfig = loadLocalZohoConfig();
    private static final int PASSWORD_RESET_CODE_LENGTH = 6;
    private static final int PASSWORD_RESET_EXPIRY_MINUTES = 10;
    private static final int MAX_PASSWORD_RESET_ATTEMPTS = 5;
    private static final int EMAIL_CHANGE_CODE_LENGTH = 6;
    private static final int EMAIL_CHANGE_EXPIRY_MINUTES = 10;
    private static final int MAX_EMAIL_CHANGE_ATTEMPTS = 5;
    private static final Map<Long, PendingEmailChange> pendingEmailChanges = new ConcurrentHashMap<>();
    private final UserDAO userDAO;
    private final PasswordResetCodeDAO passwordResetCodeDAO;
    private final NotificationEmailService notificationEmailService;
    private final UserEmailSettingsDAO userEmailSettingsDAO;
    private final SecureRandom secureRandom;

    public UserAuthService() {
        this.userDAO = new UserDAO();
        this.passwordResetCodeDAO = new PasswordResetCodeDAO();
        this.notificationEmailService = new NotificationEmailService();
        this.userEmailSettingsDAO = new UserEmailSettingsDAO();
        this.secureRandom = new SecureRandom();
    }

    public User signup(String fullName, String email, String password) {
        if (fullName == null || fullName.isBlank() || email == null || email.isBlank() || !isStrongPassword(password)) {
            return null;
        }
        if (userDAO.findByEmail(email) != null) {
            return null;
        }
        String hash = BCrypt.hashpw(password, BCrypt.gensalt(12));
        return userDAO.createUser(fullName.trim(), email.trim().toLowerCase(), hash);
    }

    public User login(String email, String password) {
        if (email == null || password == null) {
            return null;
        }
        User user = userDAO.findByEmail(email.trim().toLowerCase());
        if (user == null) {
            return null;
        }
        return BCrypt.checkpw(password, user.getPasswordHash()) ? user : null;
    }

    public User findById(long userId) {
        return userDAO.findById(userId);
    }

    public boolean requestPasswordResetTotp(String email) {
        String normalizedEmail = normalize(email);
        if (normalizedEmail == null) {
            return true;
        }
        User user = userDAO.findByEmail(normalizedEmail.toLowerCase(Locale.ROOT));
        if (user == null) {
            return true;
        }
        String code = generateNumericCode(PASSWORD_RESET_CODE_LENGTH);
        String codeHash = BCrypt.hashpw(code, BCrypt.gensalt(10));
        Timestamp expiresAt = Timestamp.from(Instant.now().plusSeconds(PASSWORD_RESET_EXPIRY_MINUTES * 60L));
        boolean saved = passwordResetCodeDAO.upsertCode(user.getId(), codeHash, expiresAt);
        if (!saved) {
            return false;
        }
        return notificationEmailService.sendPasswordResetTotp(
                user.getEmail(),
                user.getFullName(),
                code,
                PASSWORD_RESET_EXPIRY_MINUTES
        );
    }

    public boolean resetPasswordWithTotp(String email, String totpCode, String newPassword) {
        String normalizedEmail = normalize(email);
        String normalizedCode = normalize(totpCode);
        if (normalizedEmail == null || normalizedCode == null || !isStrongPassword(newPassword)) {
            return false;
        }

        User user = userDAO.findByEmail(normalizedEmail.toLowerCase(Locale.ROOT));
        if (user == null) {
            return false;
        }
        PasswordResetCode activeCode = passwordResetCodeDAO.findByUserId(user.getId());
        if (activeCode == null || Boolean.TRUE.equals(activeCode.getConsumed()) || activeCode.getExpiresAt() == null) {
            return false;
        }
        if (activeCode.getExpiresAt().before(Timestamp.from(Instant.now()))) {
            return false;
        }
        if (activeCode.getAttempts() != null && activeCode.getAttempts() >= MAX_PASSWORD_RESET_ATTEMPTS) {
            return false;
        }
        if (activeCode.getCodeHash() == null || !BCrypt.checkpw(normalizedCode, activeCode.getCodeHash())) {
            passwordResetCodeDAO.incrementAttempts(user.getId());
            return false;
        }

        String newHash = BCrypt.hashpw(newPassword, BCrypt.gensalt(12));
        boolean passwordUpdated = userDAO.updatePasswordHash(user.getId(), newHash);
        if (!passwordUpdated) {
            return false;
        }
        passwordResetCodeDAO.consume(user.getId());
        return true;
    }

    public boolean requestEmailChangeTotp(Long userId, String currentPassword, String newEmail) {
        String normalizedEmail = normalize(newEmail);
        if (userId == null || userId <= 0 || normalize(currentPassword) == null || normalizedEmail == null) {
            return false;
        }
        User user = userDAO.findById(userId);
        if (user == null || user.getPasswordHash() == null || !BCrypt.checkpw(currentPassword, user.getPasswordHash())) {
            return false;
        }
        String normalizedNewEmail = normalizedEmail.toLowerCase(Locale.ROOT);
        if (normalizedNewEmail.equalsIgnoreCase(normalize(user.getEmail()))) {
            return false;
        }
        User existing = userDAO.findByEmail(normalizedNewEmail);
        if (existing != null) {
            return false;
        }

        String code = generateNumericCode(EMAIL_CHANGE_CODE_LENGTH);
        String codeHash = BCrypt.hashpw(code, BCrypt.gensalt(10));
        PendingEmailChange pending = new PendingEmailChange(
                normalizedNewEmail,
                codeHash,
                Timestamp.from(Instant.now().plusSeconds(EMAIL_CHANGE_EXPIRY_MINUTES * 60L))
        );
        pendingEmailChanges.put(userId, pending);

        return notificationEmailService.sendEmailChangeTotp(
                normalizedNewEmail,
                user.getFullName(),
                code,
                EMAIL_CHANGE_EXPIRY_MINUTES
        );
    }

    public User confirmEmailChange(Long userId, String newEmail, String otpCode) {
        String normalizedEmail = normalize(newEmail);
        String normalizedOtp = normalize(otpCode);
        if (userId == null || userId <= 0 || normalizedEmail == null || normalizedOtp == null) {
            return null;
        }
        User user = userDAO.findById(userId);
        if (user == null) {
            return null;
        }

        PendingEmailChange pending = pendingEmailChanges.get(userId);
        if (pending == null || pending.consumed || pending.expiresAt == null) {
            return null;
        }
        if (pending.expiresAt.before(Timestamp.from(Instant.now()))) {
            pendingEmailChanges.remove(userId);
            return null;
        }
        if (pending.attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
            pendingEmailChanges.remove(userId);
            return null;
        }
        if (!pending.newEmail.equalsIgnoreCase(normalizedEmail.toLowerCase(Locale.ROOT))) {
            pending.attempts++;
            return null;
        }
        if (pending.codeHash == null || !BCrypt.checkpw(normalizedOtp, pending.codeHash)) {
            pending.attempts++;
            return null;
        }
        if (userDAO.findByEmail(pending.newEmail) != null) {
            return null;
        }

        String oldEmail = user.getEmail();
        boolean updated = userDAO.updateEmail(userId, pending.newEmail);
        if (!updated) {
            return null;
        }
        synchronizeReceiverEmailAfterAccountEmailChange(userId, oldEmail, pending.newEmail);
        pending.consumed = true;
        pendingEmailChanges.remove(userId);
        notificationEmailService.sendEmailChangeNotice(oldEmail, user.getFullName(), pending.newEmail);
        return userDAO.findById(userId);
    }

    public User loginWithZoho(String code, String redirectUri, String zohoBaseUrl) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String clientId = getConfig("MCP_ZOHO_LOGIN_CLIENT_ID", "ZOHO_LOGIN_CLIENT_ID");
        String clientSecret = getConfig("MCP_ZOHO_LOGIN_CLIENT_SECRET", "ZOHO_LOGIN_CLIENT_SECRET");
        String configuredRedirectUri = getConfig("MCP_ZOHO_LOGIN_REDIRECT_URI", "ZOHO_LOGIN_REDIRECT_URI");
        String finalRedirectUri = normalize(redirectUri);
        if (finalRedirectUri == null) {
            finalRedirectUri = normalize(configuredRedirectUri);
        }
        if (clientId == null || clientSecret == null || finalRedirectUri == null) {
            logger.error("Zoho auth config missing. Ensure MCP_ZOHO_LOGIN_CLIENT_ID, MCP_ZOHO_LOGIN_CLIENT_SECRET and MCP_ZOHO_LOGIN_REDIRECT_URI are configured.");
            return null;
        }

        String base = normalizeBaseUrl(zohoBaseUrl);
        String tokenUrl = base + "/oauth/v2/token";
        String userInfoUrl = base + "/oauth/user/info";
        try {
            Map<String, String> form = new HashMap<>();
            form.put("grant_type", "authorization_code");
            form.put("client_id", clientId);
            form.put("client_secret", clientSecret);
            form.put("redirect_uri", finalRedirectUri);
            form.put("code", code.trim());
            JsonObject tokenResponse = HttpClientUtil.doPostForm(tokenUrl, null, form);
            String accessToken = getJsonString(tokenResponse, "access_token");
            String idToken = getJsonString(tokenResponse, "id_token");
            if (accessToken == null || accessToken.isBlank()) {
                return null;
            }

            String email = null;
            String fullName = null;

            if (idToken != null) {
                JsonObject claims = decodeJwtPayload(idToken);
                email = firstNonBlank(
                        getJsonString(claims, "email"),
                        getJsonString(claims, "upn"),
                        getJsonString(claims, "preferred_username")
                );
                if (fullName == null || fullName.isBlank()) {
                    fullName = firstNonBlank(
                            getJsonString(claims, "name"),
                            getJsonString(claims, "first_name"),
                            getJsonString(claims, "given_name")
                    );
                }
            }

            if (email == null || email.isBlank()) {
                try {
                    JsonObject profileResponse = HttpClientUtil.doGet(userInfoUrl, Map.of(
                            "Authorization", "Zoho-oauthtoken " + accessToken
                    ));
                    email = firstNonBlank(
                            getJsonString(profileResponse, "Email"),
                            getJsonString(profileResponse, "email"),
                            getJsonString(profileResponse, "email_id")
                    );
                    if (fullName == null || fullName.isBlank()) {
                        fullName = firstNonBlank(
                                getJsonString(profileResponse, "Display_Name"),
                                getJsonString(profileResponse, "display_name"),
                                getJsonString(profileResponse, "Name"),
                                getJsonString(profileResponse, "name")
                        );
                    }
                } catch (Exception infoError) {
                    logger.warn("Zoho /oauth/user/info unavailable and id_token did not provide email: {}", infoError.getMessage());
                }
            }

            if (email == null || email.isBlank()) {
                logger.error("Zoho token exchange did not provide an email in user info or id_token.");
                return null;
            }
            String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
            String resolvedFullName = firstNonBlank(fullName, normalizedEmail.split("@")[0]);

            User user = userDAO.findByEmail(normalizedEmail);
            if (user != null) {
                return user;
            }
            String randomPassword = UUID.randomUUID() + "_" + UUID.randomUUID();
            String hash = BCrypt.hashpw(randomPassword, BCrypt.gensalt(12));
            return userDAO.createUser(resolvedFullName, normalizedEmail, hash);
        } catch (Exception e) {
            logger.error("Zoho login failed", e);
            return null;
        }
    }

    private String getConfig(String primaryKey, String fallbackKey) {
        String value = normalize(System.getenv(primaryKey));
        if (value != null) {
            return value;
        }
        value = normalize(System.getenv(fallbackKey));
        if (value != null) {
            return value;
        }
        value = normalize(System.getProperty(primaryKey));
        if (value != null) {
            return value;
        }
        value = normalize(System.getProperty(fallbackKey));
        if (value != null) {
            return value;
        }
        value = normalize(localZohoConfig.getProperty(primaryKey));
        if (value != null) {
            return value;
        }
        return normalize(localZohoConfig.getProperty(fallbackKey));
    }

    private String normalizeBaseUrl(String value) {
        String raw = normalize(value);
        if (raw == null) {
            raw = normalize(getConfig("MCP_ZOHO_LOGIN_BASE_URL", "ZOHO_LOGIN_BASE_URL"));
        }
        if (raw == null) {
            return "https://accounts.zoho.in";
        }
        return raw.endsWith("/") ? raw.substring(0, raw.length() - 1) : raw;
    }

    private String getJsonString(JsonObject object, String key) {
        if (object == null || key == null || !object.has(key) || object.get(key).isJsonNull()) {
            return null;
        }
        try {
            String value = object.get(key).getAsString();
            return normalize(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String normalized = normalize(value);
            if (normalized != null) {
                return normalized;
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private JsonObject decodeJwtPayload(String jwt) {
        if (jwt == null || jwt.isBlank()) {
            return null;
        }
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length < 2) {
                return null;
            }
            String payloadPart = parts[1];
            int remainder = payloadPart.length() % 4;
            if (remainder > 0) {
                payloadPart += "=".repeat(4 - remainder);
            }
            byte[] decoded = Base64.getUrlDecoder().decode(payloadPart);
            String json = new String(decoded, StandardCharsets.UTF_8);
            return JsonParser.parseString(json).getAsJsonObject();
        } catch (Exception e) {
            logger.warn("Failed to decode id_token payload", e);
            return null;
        }
    }

    private static Properties loadLocalZohoConfig() {
        Properties props = new Properties();
        try (InputStream in = UserAuthService.class.getClassLoader().getResourceAsStream("zoho-login.properties")) {
            if (in == null) {
                return props;
            }
            props.load(in);
        } catch (IOException ex) {
            logger.warn("Failed to load zoho-login.properties", ex);
        }
        return props;
    }

    private String generateNumericCode(int length) {
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < length; i++) {
            code.append(secureRandom.nextInt(10));
        }
        return code.toString();
    }

    private boolean isStrongPassword(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        boolean hasLower = false;
        boolean hasUpper = false;
        boolean hasSpecial = false;
        for (char ch : password.toCharArray()) {
            if (Character.isLowerCase(ch)) {
                hasLower = true;
            } else if (Character.isUpperCase(ch)) {
                hasUpper = true;
            } else if (!Character.isLetterOrDigit(ch)) {
                hasSpecial = true;
            }
        }
        return hasLower && hasUpper && hasSpecial;
    }

    private void synchronizeReceiverEmailAfterAccountEmailChange(Long userId, String oldEmail, String newEmail) {
        try {
            if (userId == null || userId <= 0) {
                return;
            }
            String oldNormalized = normalize(oldEmail);
            String newNormalized = normalize(newEmail);
            if (oldNormalized == null || newNormalized == null) {
                return;
            }
            UserEmailSettings settings = userEmailSettingsDAO.findByUserId(userId);
            if (settings == null) {
                return;
            }
            String receiver = normalize(settings.getReceiverEmail());
            if (receiver != null && !receiver.equalsIgnoreCase(oldNormalized)) {
                return;
            }
            settings.setUserId(userId);
            settings.setReceiverEmail(newNormalized.toLowerCase(Locale.ROOT));
            userEmailSettingsDAO.upsert(settings);
        } catch (Exception ex) {
            logger.warn("Failed to sync receiver email after account email change for userId={}", userId, ex);
        }
    }

    private static class PendingEmailChange {
        private final String newEmail;
        private final String codeHash;
        private final Timestamp expiresAt;
        private int attempts;
        private boolean consumed;

        private PendingEmailChange(String newEmail, String codeHash, Timestamp expiresAt) {
            this.newEmail = newEmail;
            this.codeHash = codeHash;
            this.expiresAt = expiresAt;
            this.attempts = 0;
            this.consumed = false;
        }
    }
}
