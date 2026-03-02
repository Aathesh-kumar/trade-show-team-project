package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserEmailSettingsDAO {
    private static final Logger logger = LogManager.getLogger(UserEmailSettingsDAO.class);
    private static final String ENSURE_TABLE_SQL =
            "CREATE TABLE IF NOT EXISTS user_email_settings (" +
                    "user_id BIGINT PRIMARY KEY," +
                    "alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE," +
                    "receiver_email VARCHAR(180) NULL," +
                    "min_severity VARCHAR(20) NOT NULL DEFAULT 'warning'," +
                    "include_server_alerts BOOLEAN NOT NULL DEFAULT TRUE," +
                    "include_tool_alerts BOOLEAN NOT NULL DEFAULT TRUE," +
                    "include_system_alerts BOOLEAN NOT NULL DEFAULT TRUE," +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
                    "CONSTRAINT fk_user_email_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
                    ")";

    public UserEmailSettings findByUserId(Long userId) {
        if (userId == null || userId <= 0) {
            return null;
        }
        try (Connection con = DBConnection.getInstance().getConnection()) {
            ensureTable(con);
            try (PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_USER_EMAIL_SETTINGS)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return mapSettings(rs);
                    }
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to load email settings for userId={}", userId, e);
        }
        return null;
    }

    public boolean upsert(UserEmailSettings settings) {
        if (settings == null || settings.getUserId() == null || settings.getUserId() <= 0) {
            return false;
        }
        try (Connection con = DBConnection.getInstance().getConnection()) {
            ensureTable(con);
            try (PreparedStatement ps = con.prepareStatement(DBQueries.UPSERT_USER_EMAIL_SETTINGS)) {
                ps.setLong(1, settings.getUserId());
                ps.setBoolean(2, settings.isAlertsEnabled());
                if (settings.getReceiverEmail() == null || settings.getReceiverEmail().isBlank()) {
                    ps.setNull(3, java.sql.Types.VARCHAR);
                } else {
                    ps.setString(3, settings.getReceiverEmail());
                }
                ps.setString(4, settings.getMinSeverity());
                ps.setBoolean(5, settings.isIncludeServerAlerts());
                ps.setBoolean(6, settings.isIncludeToolAlerts());
                ps.setBoolean(7, settings.isIncludeSystemAlerts());
                return ps.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.error("Failed to save email settings for userId={}", settings.getUserId(), e);
            return false;
        }
    }

    private void ensureTable(Connection con) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement(ENSURE_TABLE_SQL)) {
            ps.execute();
        }
    }

    private UserEmailSettings mapSettings(ResultSet rs) throws SQLException {
        UserEmailSettings settings = new UserEmailSettings();
        settings.setUserId(rs.getLong("user_id"));
        settings.setAlertsEnabled(rs.getBoolean("alerts_enabled"));
        settings.setReceiverEmail(rs.getString("receiver_email"));
        settings.setMinSeverity(rs.getString("min_severity"));
        settings.setIncludeServerAlerts(rs.getBoolean("include_server_alerts"));
        settings.setIncludeToolAlerts(rs.getBoolean("include_tool_alerts"));
        settings.setIncludeSystemAlerts(rs.getBoolean("include_system_alerts"));
        settings.setUpdatedAt(rs.getTimestamp("updated_at"));
        return settings;
    }
}
