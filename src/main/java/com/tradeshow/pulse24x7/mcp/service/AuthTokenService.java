package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.AuthTokenDAO;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;

public class AuthTokenService {
    private static final Logger logger = LogManager.getLogger(AuthTokenService.class);
    private final AuthTokenDAO authTokenDAO;

    public AuthTokenService() {
        this.authTokenDAO = new AuthTokenDAO();
    }

    public boolean saveToken(Integer serverId, String accessToken, String refreshToken, 
                            Timestamp expiresAt) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        
        if (accessToken == null || accessToken.trim().isEmpty()) {
            logger.error("Access token is required");
            return false;
        }
        
        return authTokenDAO.insertOrUpdateToken(serverId, accessToken, refreshToken, expiresAt);
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
}