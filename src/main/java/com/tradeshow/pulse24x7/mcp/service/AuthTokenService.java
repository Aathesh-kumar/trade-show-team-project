package com.tradeshow.pulse24x7.mcp.service;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.AuthTokenDAO;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class AuthTokenService {
    private static final Logger logger = LogManager.getLogger(AuthTokenService.class);
    private final AuthTokenDAO authTokenDAO;
    private final RequestLogService requestLogService;

    public AuthTokenService() {
        this.authTokenDAO = new AuthTokenDAO();
        this.requestLogService = new RequestLogService();
    }

    public boolean saveToken(Integer serverId, String headerType, String accessToken, String refreshToken,
                            Timestamp expiresAt, String clientId, String clientSecret, String tokenEndpoint) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        
        if (accessToken == null || accessToken.trim().isEmpty()) {
            logger.error("Access token is required");
            return false;
        }

        Timestamp normalizedExpiry = expiresAt;
        if (normalizedExpiry == null) {
            normalizedExpiry = Timestamp.from(Instant.now().plusSeconds(3600));
        }
        
        return authTokenDAO.insertOrUpdateToken(
                serverId, headerType, accessToken, refreshToken, normalizedExpiry, clientId, clientSecret, tokenEndpoint
        );
    }

    public AuthToken getToken(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return null;
        }
        return authTokenDAO.getAuthToken(serverId);
    }

    public String ensureValidAccessToken(Integer serverId) {
        AuthToken token = getToken(serverId);
        if (token == null) {
            return null;
        }
        if (!isTokenExpired(serverId)) {
            return token.getAccessToken();
        }
        try {
            return refreshAccessToken(serverId);
        } catch (Exception e) {
            logger.warn("Failed to refresh token for serverId={}. Falling back to existing token.", serverId, e);
            return token.getAccessToken();
        }
    }

    public boolean updateAccessToken(Integer serverId, String accessToken, Timestamp expiresAt) {
        if (serverId == null || serverId <= 0 || accessToken == null) {
            logger.error("Invalid parameters for updating access token");
            return false;
        }
        return authTokenDAO.updateAccessToken(serverId, accessToken, expiresAt);
    }

    public boolean deleteToken(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        return authTokenDAO.deleteAuthToken(serverId);
    }

    public boolean isTokenExpired(Integer serverId, int bufferMinutes) {
        if (serverId == null || serverId <= 0) {
            return true;
        }
        return authTokenDAO.isTokenExpired(serverId, bufferMinutes);
    }

    public boolean isTokenExpired(Integer serverId) {
        return isTokenExpired(serverId, 5);
    }

    public String refreshAccessToken(Integer serverId) {
        AuthToken token = getToken(serverId);
        if (token == null) {
            throw new IllegalStateException("Auth token not found");
        }
        if (token.getRefreshToken() == null || token.getRefreshToken().isBlank()) {
            throw new IllegalStateException("Refresh token is missing");
        }

        String tokenEndpoint = (token.getTokenEndpoint() == null || token.getTokenEndpoint().isBlank())
                ? "https://accounts.zoho.in/oauth/v2/token"
                : token.getTokenEndpoint();

        if (token.getClientId() == null || token.getClientId().isBlank()
                || token.getClientSecret() == null || token.getClientSecret().isBlank()) {
            throw new IllegalStateException("clientId/clientSecret required for token refresh");
        }

        try {
            var response = HttpClientUtil.doPostForm(tokenEndpoint, Map.of(), Map.of(
                    "refresh_token", token.getRefreshToken(),
                    "client_id", token.getClientId(),
                    "client_secret", token.getClientSecret(),
                    "grant_type", "refresh_token"
            ));

            if (!response.has("access_token")) {
                throw new IllegalStateException("Token refresh failed: " + response);
            }

            String newAccessToken = response.get("access_token").getAsString();
            Timestamp expiresAt = null;
            if (response.has("expires_in_sec")) {
                long seconds = response.get("expires_in_sec").getAsLong();
                expiresAt = Timestamp.from(Instant.now().plusSeconds(seconds));
            }

            boolean updated = updateAccessToken(serverId, newAccessToken, expiresAt);
            if (!updated) {
                throw new IllegalStateException("Failed to persist refreshed token");
            }
            recordTokenRefreshLog(serverId, tokenEndpoint, true, response, null);
            return newAccessToken;
        } catch (Exception e) {
            JsonObject errorBody = new JsonObject();
            errorBody.addProperty("error", e.getMessage());
            recordTokenRefreshLog(serverId, tokenEndpoint, false, errorBody, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> exchangeAuthorizationCode(Integer serverId, String code, String redirectUri, String tokenEndpointOverride) {
        if (serverId == null || serverId <= 0) {
            throw new IllegalArgumentException("Invalid serverId");
        }
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Authorization code is required");
        }
        if (redirectUri == null || redirectUri.isBlank()) {
            throw new IllegalArgumentException("redirectUri is required");
        }

        AuthToken token = getToken(serverId);
        if (token == null) {
            throw new IllegalStateException("Auth token not found");
        }
        if (token.getClientId() == null || token.getClientId().isBlank()
                || token.getClientSecret() == null || token.getClientSecret().isBlank()) {
            throw new IllegalStateException("clientId/clientSecret required for authorization code exchange");
        }

        String tokenEndpoint;
        if (tokenEndpointOverride != null && !tokenEndpointOverride.isBlank()) {
            tokenEndpoint = tokenEndpointOverride.trim();
        } else {
            tokenEndpoint = (token.getTokenEndpoint() == null || token.getTokenEndpoint().isBlank())
                    ? "https://accounts.zoho.in/oauth/v2/token"
                    : token.getTokenEndpoint();
        }

        JsonObject response = HttpClientUtil.doPostForm(tokenEndpoint, Map.of(), Map.of(
                "code", code,
                "client_id", token.getClientId(),
                "client_secret", token.getClientSecret(),
                "redirect_uri", redirectUri,
                "grant_type", "authorization_code"
        ));

        if (!response.has("access_token")) {
            throw new IllegalStateException("Token exchange failed: " + response);
        }

        String newAccessToken = response.get("access_token").getAsString();
        String newRefreshToken = response.has("refresh_token") && !response.get("refresh_token").isJsonNull()
                ? response.get("refresh_token").getAsString()
                : token.getRefreshToken();

        Timestamp expiresAt = null;
        if (response.has("expires_in_sec") && !response.get("expires_in_sec").isJsonNull()) {
            long seconds = response.get("expires_in_sec").getAsLong();
            expiresAt = Timestamp.from(Instant.now().plusSeconds(seconds));
        }

        boolean saved = saveToken(
                serverId,
                (token.getHeaderType() == null || token.getHeaderType().isBlank()) ? "Bearer" : token.getHeaderType(),
                newAccessToken,
                newRefreshToken,
                expiresAt,
                token.getClientId(),
                token.getClientSecret(),
                tokenEndpoint
        );
        if (!saved) {
            throw new IllegalStateException("Failed to persist exchanged tokens");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("message", "OAuth tokens regenerated");
        result.put("accessToken", newAccessToken);
        result.put("refreshToken", newRefreshToken);
        result.put("expiresAt", expiresAt);
        return result;
    }

    private void recordTokenRefreshLog(Integer serverId, String tokenEndpoint, boolean success,
                                       JsonObject responseBody, String errorMessage) {
        JsonObject requestPayload = new JsonObject();
        requestPayload.addProperty("event", "token_refresh");
        requestPayload.addProperty("tokenEndpoint", tokenEndpoint);
        requestPayload.addProperty("grant_type", "refresh_token");

        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        null,
                        "__TOKEN_REFRESH__",
                        "POST",
                        success ? 200 : 401,
                        success ? "OK" : "ERR",
                        0L,
                        requestPayload,
                        responseBody == null ? new JsonObject() : responseBody,
                        errorMessage,
                        "Pulse24x7-AuthRefresh"
                )
        );
    }
}
