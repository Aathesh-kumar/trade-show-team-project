package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.Notification;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class NotificationDAO {
    private static final Logger logger = LogManager.getLogger(NotificationDAO.class);

    public boolean insert(Notification notification) {
        return insertAndReturn(notification) != null;
    }

    public Notification insertAndReturn(Notification notification) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_NOTIFICATION, Statement.RETURN_GENERATED_KEYS)) {
            if (notification.getServerId() == null) {
                ps.setNull(1, java.sql.Types.INTEGER);
            } else {
                ps.setInt(1, notification.getServerId());
            }
            ps.setString(2, notification.getCategory());
            ps.setString(3, notification.getSeverity());
            ps.setString(4, notification.getTitle());
            ps.setString(5, notification.getMessage());
            int inserted = ps.executeUpdate();
            if (inserted <= 0) {
                return null;
            }
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    long id = keys.getLong(1);
                    return getById(id);
                }
            }
            return null;
        } catch (SQLException e) {
            logger.error("Failed to insert notification", e);
            return null;
        }
    }

    public List<Notification> getRecent(int limit, int offset) {
        return getRecentByServer(null, limit, offset);
    }

    public List<Notification> getRecentByServer(Integer serverId, int limit, int offset) {
        List<Notification> list = new ArrayList<>();
        String sql = serverId == null ? DBQueries.SELECT_NOTIFICATIONS : DBQueries.SELECT_NOTIFICATIONS_BY_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            int idx = 1;
            if (serverId != null) {
                ps.setInt(idx++, serverId);
            }
            ps.setInt(idx++, Math.max(1, limit));
            ps.setInt(idx, Math.max(0, offset));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch notifications", e);
        }
        return list;
    }

    public List<Notification> getRecentByUser(Long userId, Integer serverId, int limit, int offset) {
        if (userId == null || userId <= 0) {
            return List.of();
        }
        List<Notification> list = new ArrayList<>();
        String sql = serverId == null ? DBQueries.SELECT_NOTIFICATIONS_BY_USER : DBQueries.SELECT_NOTIFICATIONS_BY_USER_AND_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            int idx = 1;
            ps.setLong(idx++, userId);
            if (serverId != null) {
                ps.setInt(idx++, serverId);
            }
            ps.setInt(idx++, Math.max(1, limit));
            ps.setInt(idx, Math.max(0, offset));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch notifications for userId={}", userId, e);
        }
        return list;
    }

    public boolean deleteById(long id) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DELETE_NOTIFICATION)) {
            ps.setLong(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to delete notification: {}", id, e);
            return false;
        }
    }

    public boolean deleteByIdForUser(long id, long userId) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DELETE_NOTIFICATION_BY_USER)) {
            ps.setLong(1, id);
            ps.setLong(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to delete notification {} for user {}", id, userId, e);
            return false;
        }
    }

    public int deleteAll() {
        return deleteAllByServer(null);
    }

    public int deleteAllByServer(Integer serverId) {
        String sql = serverId == null ? DBQueries.DELETE_ALL_NOTIFICATIONS : DBQueries.DELETE_ALL_NOTIFICATIONS_BY_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            if (serverId != null) {
                ps.setInt(1, serverId);
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to delete all notifications", e);
            return 0;
        }
    }

    public int deleteAllByUser(Long userId, Integer serverId) {
        if (userId == null || userId <= 0) {
            return 0;
        }
        String sql = serverId == null ? DBQueries.DELETE_ALL_NOTIFICATIONS_BY_USER : DBQueries.DELETE_ALL_NOTIFICATIONS_BY_USER_AND_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, userId);
            if (serverId != null) {
                ps.setInt(2, serverId);
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to delete notifications for userId={}", userId, e);
            return 0;
        }
    }

    public boolean markRead(long id) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.MARK_NOTIFICATION_READ)) {
            ps.setLong(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to mark notification read: {}", id, e);
            return false;
        }
    }

    public boolean markReadForUser(long id, long userId) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.MARK_NOTIFICATION_READ_BY_USER)) {
            ps.setLong(1, id);
            ps.setLong(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to mark notification {} as read for user {}", id, userId, e);
            return false;
        }
    }

    public int markAllRead() {
        return markAllReadByServer(null);
    }

    public int markAllReadByServer(Integer serverId) {
        String sql = serverId == null ? DBQueries.MARK_ALL_NOTIFICATIONS_READ : DBQueries.MARK_ALL_NOTIFICATIONS_READ_BY_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            if (serverId != null) {
                ps.setInt(1, serverId);
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to mark all notifications as read", e);
            return 0;
        }
    }

    public int markAllReadByUser(Long userId, Integer serverId) {
        if (userId == null || userId <= 0) {
            return 0;
        }
        String sql = serverId == null ? DBQueries.MARK_ALL_NOTIFICATIONS_READ_BY_USER : DBQueries.MARK_ALL_NOTIFICATIONS_READ_BY_USER_AND_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, userId);
            if (serverId != null) {
                ps.setInt(2, serverId);
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to mark notifications read for userId={}", userId, e);
            return 0;
        }
    }

    public long countUnread() {
        return countUnreadByServer(null);
    }

    public long countUnreadByServer(Integer serverId) {
        String sql = serverId == null ? DBQueries.COUNT_UNREAD_NOTIFICATIONS : DBQueries.COUNT_UNREAD_NOTIFICATIONS_BY_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            if (serverId != null) {
                ps.setInt(1, serverId);
            }
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("unread_count");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to count unread notifications", e);
        }
        return 0;
    }

    public long countUnreadByUser(Long userId, Integer serverId) {
        if (userId == null || userId <= 0) {
            return 0;
        }
        String sql = serverId == null ? DBQueries.COUNT_UNREAD_NOTIFICATIONS_BY_USER : DBQueries.COUNT_UNREAD_NOTIFICATIONS_BY_USER_AND_SERVER;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, userId);
            if (serverId != null) {
                ps.setInt(2, serverId);
            }
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("unread_count");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to count unread notifications for userId={}", userId, e);
        }
        return 0;
    }

    public Notification getById(long id) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_NOTIFICATION_BY_ID)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSet(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch notification by id={}", id, e);
        }
        return null;
    }

    private Notification mapResultSet(ResultSet rs) throws SQLException {
        Notification n = new Notification();
        n.setId(rs.getLong("id"));
        int serverId = rs.getInt("server_id");
        n.setServerId(rs.wasNull() ? null : serverId);
        n.setCategory(rs.getString("category"));
        n.setSeverity(rs.getString("severity"));
        n.setTitle(rs.getString("title"));
        n.setMessage(rs.getString("message"));
        n.setRead(rs.getBoolean("is_read"));
        n.setCreatedAt(rs.getTimestamp("created_at"));
        return n;
    }
}
