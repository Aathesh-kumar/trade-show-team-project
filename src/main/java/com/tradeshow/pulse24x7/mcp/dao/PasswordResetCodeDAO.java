package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.PasswordResetCode;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;

public class PasswordResetCodeDAO {
    private static final Logger logger = LogManager.getLogger(PasswordResetCodeDAO.class);
    private static final String ENSURE_TABLE_SQL =
            "CREATE TABLE IF NOT EXISTS password_reset_codes (" +
                    "user_id BIGINT PRIMARY KEY," +
                    "code_hash VARCHAR(255) NOT NULL," +
                    "expires_at TIMESTAMP NOT NULL," +
                    "attempts INT NOT NULL DEFAULT 0," +
                    "consumed BOOLEAN NOT NULL DEFAULT FALSE," +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
                    "CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
                    ")";

    public boolean upsertCode(Long userId, String codeHash, Timestamp expiresAt) {
        if (userId == null || userId <= 0 || codeHash == null || codeHash.isBlank() || expiresAt == null) {
            return false;
        }
        try (Connection con = DBConnection.getInstance().getConnection()) {
            ensureTable(con);
            try (PreparedStatement ps = con.prepareStatement(DBQueries.UPSERT_PASSWORD_RESET_CODE)) {
                ps.setLong(1, userId);
                ps.setString(2, codeHash);
                ps.setTimestamp(3, expiresAt);
                return ps.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.error("Failed to upsert password reset code for userId={}", userId, e);
            return false;
        }
    }

    public PasswordResetCode findByUserId(Long userId) {
        if (userId == null || userId <= 0) {
            return null;
        }
        try (Connection con = DBConnection.getInstance().getConnection()) {
            ensureTable(con);
            try (PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_PASSWORD_RESET_CODE)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        PasswordResetCode code = new PasswordResetCode();
                        code.setUserId(rs.getLong("user_id"));
                        code.setCodeHash(rs.getString("code_hash"));
                        code.setExpiresAt(rs.getTimestamp("expires_at"));
                        code.setAttempts(rs.getInt("attempts"));
                        code.setConsumed(rs.getBoolean("consumed"));
                        code.setUpdatedAt(rs.getTimestamp("updated_at"));
                        return code;
                    }
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch password reset code for userId={}", userId, e);
        }
        return null;
    }

    public boolean incrementAttempts(Long userId) {
        return updateSingleRow(DBQueries.INCREMENT_PASSWORD_RESET_ATTEMPTS, userId);
    }

    public boolean consume(Long userId) {
        return updateSingleRow(DBQueries.CONSUME_PASSWORD_RESET_CODE, userId);
    }

    private boolean updateSingleRow(String sql, Long userId) {
        if (userId == null || userId <= 0) {
            return false;
        }
        try (Connection con = DBConnection.getInstance().getConnection()) {
            ensureTable(con);
            try (PreparedStatement ps = con.prepareStatement(sql)) {
                ps.setLong(1, userId);
                return ps.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.error("Failed to update reset code record for userId={}", userId, e);
            return false;
        }
    }

    private void ensureTable(Connection con) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement(ENSURE_TABLE_SQL)) {
            ps.execute();
        }
    }
}
