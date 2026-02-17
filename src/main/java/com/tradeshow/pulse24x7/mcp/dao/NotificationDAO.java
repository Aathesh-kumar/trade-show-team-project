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
import java.util.ArrayList;
import java.util.List;

public class NotificationDAO {
    private static final Logger logger = LogManager.getLogger(NotificationDAO.class);

    public boolean insert(Notification notification) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_NOTIFICATION)) {
            if (notification.getServerId() == null) {
                ps.setNull(1, java.sql.Types.INTEGER);
            } else {
                ps.setInt(1, notification.getServerId());
            }
            ps.setString(2, notification.getCategory());
            ps.setString(3, notification.getSeverity());
            ps.setString(4, notification.getTitle());
            ps.setString(5, notification.getMessage());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to insert notification", e);
            return false;
        }
    }

    public List<Notification> getRecent(int limit) {
        List<Notification> list = new ArrayList<>();
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_NOTIFICATIONS)) {
            ps.setInt(1, Math.max(1, limit));
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

    public int markAllRead() {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.MARK_ALL_NOTIFICATIONS_READ)) {
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to mark all notifications as read", e);
            return 0;
        }
    }

    public long countUnread() {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.COUNT_UNREAD_NOTIFICATIONS);
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                return rs.getLong("unread_count");
            }
        } catch (SQLException e) {
            logger.error("Failed to count unread notifications", e);
        }
        return 0;
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
