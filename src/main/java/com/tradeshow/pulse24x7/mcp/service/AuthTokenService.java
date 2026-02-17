package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.AuthTokenDAO;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;

public class AuthTokenService {
    private static final Logger logger = LogManager.getLogger(AuthTokenService.class);
    private final AuthTokenDAO authTokenDAO;

    public AuthTokenService() {
        this.authTokenDAO = new AuthTokenDAO();
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
        
        return authTokenDAO.insertOrUpdateToken(
                serverId, headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint
        );
    }

    public boolean saveToken(Integer serverId, String headerType, String accessToken, String refreshToken,
                             Timestamp expiresAt) {
        return saveToken(serverId, headerType, accessToken, refreshToken, expiresAt, null, null, null);
    }

    public AuthToken getToken(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return null;
        }
        return authTokenDAO.getAuthToken(serverId);
    }

    public String getAccessToken(Integer serverId) {
        AuthToken token = getToken(serverId);
        return token != null ? token.getAccessToken() : null;
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
        return newAccessToken;
    }
}
