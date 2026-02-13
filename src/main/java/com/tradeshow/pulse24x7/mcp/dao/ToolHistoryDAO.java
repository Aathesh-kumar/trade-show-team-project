package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.ToolHistory;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import com.tradeshow.pulse24x7.mcp.utils.TimeUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ToolHistoryDAO {
    private static final Logger logger = LogManager.getLogger(ToolHistoryDAO.class);

    public boolean insertHistory(Integer toolId, Boolean isAvailable) {
        logger.debug("Inserting tool history: toolId={}, available={}", toolId, isAvailable);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_TOOL_HISTORY)) {

            ps.setInt(1, toolId);
            ps.setBoolean(2, isAvailable);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.debug("Tool history inserted successfully for tool ID: {}", toolId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to insert tool history for tool ID: {}", toolId, e);
        }
        return false;
    }
    public List<ToolHistory> getToolHistory(Integer toolId, int limit) {
        logger.debug("Fetching tool history for tool ID: {} with limit: {}", toolId, limit);
        List<ToolHistory> historyList = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_HISTORY)) {

            ps.setInt(1, toolId);
            ps.setInt(2, limit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToToolHistory(rs));
                }
            }

            logger.info("Fetched {} tool history records for tool ID: {}",
                    historyList.size(), toolId);
        } catch (SQLException e) {
            logger.error("Failed to fetch tool history for tool ID: {}", toolId, e);
        }
        return historyList;
    }

    public List<ToolHistory> getToolHistoryRange(Integer toolId, Timestamp startTime,
                                                 Timestamp endTime) {
        logger.debug("Fetching tool history for tool ID: {} from {} to {}",
                toolId, startTime, endTime);
        List<ToolHistory> historyList = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_HISTORY_RANGE)) {

            ps.setInt(1, toolId);
            ps.setTimestamp(2, startTime);
            ps.setTimestamp(3, endTime);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToToolHistory(rs));
                }
            }

            logger.info("Fetched {} tool history records for tool ID: {} in range",
                    historyList.size(), toolId);
        } catch (SQLException e) {
            logger.error("Failed to fetch tool history range for tool ID: {}", toolId, e);
        }
        return historyList;
    }

    public List<ToolHistory> getToolHistoryLastHours(Integer toolId, int hours) {
        logger.debug("Fetching tool history for tool ID: {} for last {} hours", toolId, hours);
        List<ToolHistory> historyList = new ArrayList<>();

        Timestamp cutoffTime = TimeUtil.getTimestampHoursAgo(hours);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_HISTORY_LAST_HOURS)) {

            ps.setInt(1, toolId);
            ps.setTimestamp(2, cutoffTime);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    historyList.add(mapResultSetToToolHistory(rs));
                }
            }

            logger.info("Fetched {} tool history records for tool ID: {} (last {} hours)",
                    historyList.size(), toolId, hours);
        } catch (SQLException e) {
            logger.error("Failed to fetch tool history for last {} hours for tool ID: {}",
                    hours, toolId, e);
        }
        return historyList;
    }

    public Double getToolAvailabilityPercent(Integer toolId) {
        logger.debug("Fetching availability percentage for tool ID: {}", toolId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_AVAILABILITY_PERCENT)) {

            ps.setInt(1, toolId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getDouble("availability_percent");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch availability percentage for tool ID: {}", toolId, e);
        }
        return 0.0;
    }

    private ToolHistory mapResultSetToToolHistory(ResultSet rs) throws SQLException {
        return new ToolHistory(
                rs.getInt("tool_id"),
                rs.getBoolean("is_available"),
                rs.getTimestamp("checked_at")
        );
    }
}