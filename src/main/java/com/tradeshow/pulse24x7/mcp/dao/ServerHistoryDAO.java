package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.ServerHistory;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ServerHistoryDAO {
    private static final Logger logger = LogManager.getLogger(ServerHistoryDAO.class);

    public boolean insertHistory(Integer serverId, Boolean serverUp, Integer toolCount) {
        logger.debug("Inserting server history: serverId={}, serverUp={}, toolCount={}",
                serverId, serverUp, toolCount);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_SERVER_HISTORY)) {

            ps.setInt(1, serverId);
            ps.setBoolean(2, serverUp);
            ps.setInt(3, toolCount);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.debug("Server history inserted successfully for server ID: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to insert server history for server ID: {}", serverId, e);
        }
        return false;
    }

    public List<ServerHistory> getServerHistory(Integer serverId, int limit) {
        logger.debug("Fetching server history for server ID: {} with limit: {}", serverId, limit);
        List<ServerHistory> historyList = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_HISTORY)) {

            ps.setInt(1, serverId);
            ps.setInt(2, limit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToServerHistory(rs));
                }
            }

            logger.info("Fetched {} server history records for server ID: {}",
                    historyList.size(), serverId);
        } catch (SQLException e) {
            logger.error("Failed to fetch server history for server ID: {}", serverId, e);
        }
        return historyList;
    }

    public List<ServerHistory> getServerHistoryRange(Integer serverId, Timestamp startTime,
                                                     Timestamp endTime) {
        logger.debug("Fetching server history for server ID: {} from {} to {}",
                serverId, startTime, endTime);
        List<ServerHistory> historyList = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_HISTORY_RANGE)) {

            ps.setInt(1, serverId);
            ps.setTimestamp(2, startTime);
            ps.setTimestamp(3, endTime);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToServerHistory(rs));
                }
            }

            logger.info("Fetched {} server history records for server ID: {} in range",
                    historyList.size(), serverId);
        } catch (SQLException e) {
            logger.error("Failed to fetch server history range for server ID: {}", serverId, e);
        }
        return historyList;
    }

    public List<ServerHistory> getServerHistoryLastHours(Integer serverId, int hours) {
        logger.debug("Fetching server history for server ID: {} for last {} hours",
                serverId, hours);
        List<ServerHistory> historyList = new ArrayList<>();

        Timestamp cutoffTime = Timestamp.from(Instant.now().minusSeconds(Math.max(1, hours) * 3600L));

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_HISTORY_LAST_HOURS)) {

            ps.setInt(1, serverId);
            ps.setTimestamp(2, cutoffTime);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToServerHistory(rs));
                }
            }

            logger.info("Fetched {} server history records for server ID: {} (last {} hours)",
                    historyList.size(), serverId, hours);
        } catch (SQLException e) {
            logger.error("Failed to fetch server history for last {} hours for server ID: {}",
                    hours, serverId, e);
        }
        return historyList;
    }

    public Boolean getLastServerStatus(Integer serverId) {
        logger.debug("Fetching last server status for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_LAST_SERVER_STATUS)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getBoolean("server_up");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch last server status for server ID: {}", serverId, e);
        }
        return null;
    }

    public Integer getLastToolCount(Integer serverId) {
        logger.debug("Fetching last tool count for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_LAST_TOOL_COUNT)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("tool_count");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch last tool count for server ID: {}", serverId, e);
        }
        return null;
    }

    public ServerHistory getLastHistory(Integer serverId) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_LAST_SERVER_HISTORY)) {
            ps.setInt(1, serverId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new ServerHistory(
                            serverId,
                            rs.getBoolean("server_up"),
                            rs.getInt("tool_count"),
                            rs.getTimestamp("checked_at")
                    );
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch last server history for server ID: {}", serverId, e);
        }
        return null;
    }
    
    public Integer getTotalChecks(Integer serverId) {
        logger.debug("Fetching total checks for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOTAL_CHECKS)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("total_checks");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch total checks for server ID: {}", serverId, e);
        }
        return 0;
    }

    public Double getUptimePercent(Integer serverId) {
        logger.debug("Fetching uptime percentage for server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_UPTIME_PERCENT)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getDouble("uptime_percent");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch uptime percentage for server ID: {}", serverId, e);
        }
        return 0.0;
    }

    private ServerHistory mapResultSetToServerHistory(ResultSet rs) throws SQLException {
        return new ServerHistory(
                rs.getInt("server_id"),
                rs.getBoolean("server_up"),
                rs.getInt("tool_count"),
                rs.getTimestamp("checked_at")
        );
    }
}
