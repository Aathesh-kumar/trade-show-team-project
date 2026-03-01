package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.UserDAO;
import com.tradeshow.pulse24x7.mcp.model.User;
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

public class UserAuthService {
    private static final Logger logger = LogManager.getLogger(UserAuthService.class);
    private static final Properties localZohoConfig = loadLocalZohoConfig();
    private final UserDAO userDAO;

    public UserAuthService() {
        this.userDAO = new UserDAO();
    }

    public User signup(String fullName, String email, String password) {
        if (fullName == null || fullName.isBlank() || email == null || email.isBlank() || password == null || password.length() < 6) {
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
}
