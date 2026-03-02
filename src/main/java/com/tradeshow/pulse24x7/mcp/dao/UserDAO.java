package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.NotificationRecipient;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class UserDAO {
    private static final Logger logger = LogManager.getLogger(UserDAO.class);

    public User findByEmail(String email) {
        String sql = "SELECT id, full_name, email, password_hash, role, created_at, updated_at FROM users WHERE email = ?";
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapUser(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to find user by email", e);
        }
        return null;
    }

    public User findById(long id) {
        String sql = "SELECT id, full_name, email, password_hash, role, created_at, updated_at FROM users WHERE id = ?";
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapUser(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to find user by id", e);
        }
        return null;
    }

    public User createUser(String fullName, String email, String passwordHash) {
        String sql = "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'ADMIN')";
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, fullName);
            ps.setString(2, email);
            ps.setString(3, passwordHash);
            int affected = ps.executeUpdate();
            if (affected <= 0) {
                return null;
            }
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    return findById(keys.getLong(1));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to create user", e);
        }
        return null;
    }

    public NotificationRecipient findNotificationRecipientByServerId(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            return null;
        }
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_NOTIFICATION_OWNER_BY_SERVER)) {
            ps.setInt(1, serverId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    NotificationRecipient recipient = new NotificationRecipient();
                    recipient.setUserId(rs.getLong("user_id"));
                    recipient.setFullName(rs.getString("full_name"));
                    recipient.setEmail(rs.getString("email"));
                    return recipient;
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to resolve notification owner for serverId={}", serverId, e);
        }
        return null;
    }

    public boolean updatePasswordHash(Long userId, String passwordHash) {
        if (userId == null || userId <= 0 || passwordHash == null || passwordHash.isBlank()) {
            return false;
        }
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_USER_PASSWORD_HASH)) {
            ps.setString(1, passwordHash);
            ps.setLong(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to update password hash for userId={}", userId, e);
            return false;
        }
    }

    public boolean updateEmail(Long userId, String newEmail) {
        if (userId == null || userId <= 0 || newEmail == null || newEmail.isBlank()) {
            return false;
        }
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_USER_EMAIL)) {
            ps.setString(1, newEmail.trim().toLowerCase());
            ps.setLong(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to update email for userId={}", userId, e);
            return false;
        }
    }

    private User mapUser(ResultSet rs) throws SQLException {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setFullName(rs.getString("full_name"));
        user.setEmail(rs.getString("email"));
        user.setPasswordHash(rs.getString("password_hash"));
        user.setRole(rs.getString("role"));
        user.setCreatedAt(rs.getTimestamp("created_at"));
        user.setUpdatedAt(rs.getTimestamp("updated_at"));
        return user;
    }
}
