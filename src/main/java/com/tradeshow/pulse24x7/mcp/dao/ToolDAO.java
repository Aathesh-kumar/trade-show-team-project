package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ToolDAO {
    private static final Logger logger = LogManager.getLogger(ToolDAO.class);

    public boolean insertTool(String toolName, String description, String toolType,
                              String inputSchema, String outputSchema, Integer serverId) {
        logger.info("Inserting/Updating tool: {} for server ID: {}", toolName, serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_TOOL)) {

            ps.setString(1, toolName);
            ps.setString(2, description);
            ps.setString(3, toolType);
            ps.setString(4, inputSchema);
            ps.setString(5, outputSchema);
            ps.setInt(6, serverId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Tool inserted/updated successfully: {}", toolName);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to insert/update tool: {} for server: {}", toolName, serverId, e);
        }
        return false;
    }

    public boolean updateToolRequestMetrics(Integer toolId, boolean success, int statusCode, long latencyMs) {
        logger.debug("Updating metrics for toolId={} success={} statusCode={} latencyMs={}",
                toolId, success, statusCode, latencyMs);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_TOOL_REQUEST_METRICS)) {
            ps.setBoolean(1, success);
            ps.setInt(2, statusCode);
            ps.setLong(3, latencyMs);
            ps.setInt(4, toolId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to update tool request metrics for toolId={}", toolId, e);
            return false;
        }
    }

    public Tool getToolById(Integer toolId) {
        logger.debug("Fetching tool by ID: {}", toolId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_BY_ID)) {

            ps.setInt(1, toolId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToTool(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch tool by ID: {}", toolId, e);
        }
        return null;
    }

    public List<Tool> getToolsByServer(Integer serverId) {
        logger.debug("Fetching all tools for server ID: {}", serverId);
        List<Tool> tools = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOLS_BY_SERVER)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tools.add(mapResultSetToTool(rs));
                }
            }

            logger.info("Fetched {} tools for server ID: {}", tools.size(), serverId);
        } catch (SQLException e) {
            logger.error("Failed to fetch tools for server ID: {}", serverId, e);
        }
        return tools;
    }

    public List<Tool> getAvailableTools(Integer serverId) {
        logger.debug("Fetching available tools for server ID: {}", serverId);
        List<Tool> tools = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_AVAILABLE_TOOLS)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tools.add(mapResultSetToTool(rs));
                }
            }

            logger.info("Fetched {} available tools for server ID: {}", tools.size(), serverId);
        } catch (SQLException e) {
            logger.error("Failed to fetch available tools for server ID: {}", serverId, e);
        }
        return tools;
    }

    public boolean updateToolAvailability(Integer toolId, Boolean isAvailable) {
        logger.info("Updating tool availability: toolId={}, available={}", toolId, isAvailable);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_TOOL_AVAILABILITY)) {

            ps.setBoolean(1, isAvailable);
            ps.setInt(2, toolId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Tool availability updated successfully: {}", toolId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to update tool availability: {}", toolId, e);
        }
        return false;
    }

    public int disableMissingTools(Integer serverId, List<Tool> activeTools) {
        if (activeTools == null || activeTools.isEmpty()) {
            logger.warn("No active tools provided for server ID: {}", serverId);
            return 0;
        }

        // Extract tool names
        List<String> toolNames = activeTools.stream()
                .map(Tool::getToolName)
                .toList();

        // Create placeholders for IN clause
        String placeholders = String.join(",", Collections.nCopies(toolNames.size(), "?"));
        String query = String.format(DBQueries.DISABLE_MISSING_TOOLS, placeholders);

        logger.info("Disabling missing tools for server ID: {} (keeping {} tools active)",
                serverId, toolNames.size());

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(query)) {

            ps.setInt(1, serverId);

            // Set tool names in the IN clause
            for (int i = 0; i < toolNames.size(); i++) {
                ps.setString(i + 2, toolNames.get(i));
            }

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("{} tools disabled for server ID: {}", affectedRows, serverId);
            }

            return affectedRows;
        } catch (SQLException e) {
            logger.error("Failed to disable missing tools for server ID: {}", serverId, e);
            return 0;
        }
    }

    public int disableAllToolsByServer(Integer serverId) {
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DISABLE_ALL_TOOLS_BY_SERVER)) {
            ps.setInt(1, serverId);
            return ps.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to disable all tools for server ID: {}", serverId, e);
            return 0;
        }
    }

    public Integer getToolIdByNameAndServer(String toolName, Integer serverId) {
        logger.debug("Fetching tool ID for: {} on server: {}", toolName, serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_TOOL_ID_BY_NAME_AND_SERVER)) {

            ps.setString(1, toolName);
            ps.setInt(2, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("tool_id");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch tool ID for: {} on server: {}", toolName, serverId, e);
        }
        return null;
    }

    private Tool mapResultSetToTool(ResultSet rs) throws SQLException {
        return new Tool(
                rs.getInt("tool_id"),
                rs.getString("tool_name"),
                rs.getString("tool_description"),
                rs.getString("tool_type"),
                rs.getString("input_schema"),
                rs.getString("output_schema"),
                rs.getBoolean("is_availability"),
                rs.getInt("total_requests"),
                rs.getInt("success_requests"),
                rs.getInt("last_status_code"),
                rs.getLong("last_latency_ms"),
                rs.getTimestamp("create_at"),
                rs.getTimestamp("last_modify"),
                rs.getInt("server_id")
        );
    }
}
