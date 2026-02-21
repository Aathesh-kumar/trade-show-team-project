package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class AuthTokenDAO {
    private static final Logger logger = LogManager.getLogger(AuthTokenDAO.class);

    public boolean insertOrUpdateToken(int serverId, String headerType, String accessToken,
                                       String refreshToken, Timestamp expiresAt,
                                       String clientId, String clientSecret, String tokenEndpoint, String oauthTokenLink) {
        logger.info("Inserting/updating auth token for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_AUTH_TOKEN)) {

            ps.setInt(1, serverId);
            ps.setString(2, headerType);
            ps.setString(3, accessToken);
            ps.setString(4, refreshToken);
            ps.setTimestamp(5, expiresAt);
            ps.setString(6, clientId);
            ps.setString(7, clientSecret);
            ps.setString(8, tokenEndpoint);
            ps.setString(9, oauthTokenLink);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Auth token inserted/updated successfully for server ID: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to insert/update auth token for server ID: {}", serverId, e);
        }
        return false;
    }

    public AuthToken getAuthToken(int serverId) {
        logger.debug("Fetching auth token for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_AUTH_TOKEN)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToAuthToken(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch auth token for server ID: {}", serverId, e);
        }
        return null;
    }

    public boolean updateAccessToken(int serverId, String accessToken, Timestamp expiresAt) {
        logger.info("Updating access token for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_ACCESS_TOKEN)) {

            ps.setString(1, accessToken);
            ps.setTimestamp(2, expiresAt);
            ps.setInt(3, serverId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Access token updated successfully for server ID: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to update access token for server ID: {}", serverId, e);
        }
        return false;
    }

    public boolean deleteAuthToken(int serverId) {
        logger.info("Deleting auth token for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DELETE_AUTH_TOKEN)) {

            ps.setInt(1, serverId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Auth token deleted successfully for server ID: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to delete auth token for server ID: {}", serverId, e);
        }
        return false;
    }

    public List<AuthToken> getExpiredTokens() {
        logger.debug("Fetching expired auth tokens");
        List<AuthToken> tokens = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_EXPIRED_TOKENS);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                tokens.add(mapResultSetToAuthToken(rs));
            }

            logger.info("Found {} expired tokens", tokens.size());
        } catch (SQLException e) {
            logger.error("Failed to fetch expired tokens", e);
        }
        return tokens;
    }

    public boolean isTokenExpired(int serverId, int bufferMinutes) {
        AuthToken token = getAuthToken(serverId);
        if (token == null) {
            return true;
        }
        if (token.getExpiresAt() == null) {
            return false;
        }

        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp bufferTime = new Timestamp(now.getTime() + (bufferMinutes * 60 * 1000L));

        return token.getExpiresAt().before(bufferTime);
    }

    private AuthToken mapResultSetToAuthToken(ResultSet rs) throws SQLException {
        return new AuthToken(
                rs.getInt("server_id"),
                rs.getString("header_type"),
                rs.getString("access_token"),
                rs.getString("refresh_token"),
                rs.getTimestamp("expires_at"),
                rs.getString("client_id"),
                rs.getString("client_secret"),
                rs.getString("token_endpoint"),
                rs.getString("oauth_token_link"),
                rs.getTimestamp("updated_at")
        );
    }
}
