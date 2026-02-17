package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.RequestLogDAO;
import com.tradeshow.pulse24x7.mcp.dao.ServerDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolDAO;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;


@WebServlet("/dashboard/*")
public class DashboardServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(DashboardServlet.class);
    private RequestLogDAO requestLogDAO;

    @Override
    public void init() throws ServletException {
        super.init();
        requestLogDAO = new RequestLogDAO();
        logger.info("DashboardServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("GET request to DashboardServlet: {}", req.getPathInfo());

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/stats")) {
                handleGetDashboardStats(req, resp);
            } else if (pathInfo.equals("/top-tools")) {
                handleGetTopPerformingTools(req, resp);
            } else if (pathInfo.equals("/system-health")) {
                handleGetSystemHealth(req, resp);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleGetDashboardStats(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("serverId");
        Integer serverId = serverIdStr != null ? parseIntOrNull(serverIdStr) : null;

        Map<String, Object> stats = new HashMap<>();

        // Get server stats
        int totalServers = getTotalServersCount();
        int activeServers = getActiveServersCount();
        stats.put("totalServers", totalServers);
        stats.put("activeServers", activeServers);

        // Get tool stats
        int totalTools = getTotalToolsCount(serverId);
        int activeTools = getActiveToolsCount(serverId);
        stats.put("totalTools", totalTools);
        stats.put("activeTools", activeTools);

        // Get request stats
        if (serverId != null) {
            Map<String, Object> requestStats = requestLogDAO.getStats(serverId);
            stats.putAll(requestStats);
        }

        sendSuccessResponse(resp, stats);
    }

    private void handleGetTopPerformingTools(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("serverId");
        String limitStr = req.getParameter("limit");
        String hoursStr = req.getParameter("hours");

        Integer serverId = serverIdStr != null ? parseIntOrNull(serverIdStr) : null;
        int limit = limitStr != null ? parseIntOrNull(limitStr) : 5;
        int hours = hoursStr != null ? parseIntOrNull(hoursStr) : 24;

        List<Map<String, Object>> topTools = getTopPerformingTools(serverId, limit, hours);

        Map<String, Object> response = new HashMap<>();
        response.put("tools", topTools);
        response.put("period", hours + " hours");

        sendSuccessResponse(resp, response);
    }

    private void handleGetSystemHealth(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("serverId");
        String hoursStr = req.getParameter("hours");

        Integer serverId = serverIdStr != null ? parseIntOrNull(serverIdStr) : null;
        int hours = hoursStr != null ? parseIntOrNull(hoursStr) : 24;

        List<Map<String, Object>> healthData = getSystemHealthData(serverId, hours);

        Map<String, Object> response = new HashMap<>();
        response.put("data", healthData);
        response.put("period", hours + " hours");

        sendSuccessResponse(resp, response);
    }

    private int getTotalServersCount() {
        String sql = "SELECT COUNT(*) as count FROM servers";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getInt("count");
            }
        } catch (SQLException e) {
            logger.error("Error getting total servers count", e);
        }
        return 0;
    }

    private int getActiveServersCount() {
        String sql = "SELECT COUNT(DISTINCT server_id) as count FROM server_history " +
                    "WHERE checked_at >= NOW() - INTERVAL 1 HOUR AND server_up = 1";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) {
                return rs.getInt("count");
            }
        } catch (SQLException e) {
            logger.error("Error getting active servers count", e);
        }
        return 0;
    }

    private int getTotalToolsCount(Integer serverId) {
        String sql = serverId != null ? 
            "SELECT COUNT(*) as count FROM tools WHERE server_id = ?" :
            "SELECT COUNT(*) as count FROM tools";
            
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (serverId != null) {
                stmt.setInt(1, serverId);
            }
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("count");
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting total tools count", e);
        }
        return 0;
    }

    private int getActiveToolsCount(Integer serverId) {
        String sql = serverId != null ?
            "SELECT COUNT(DISTINCT tool_id) as count FROM tools_history " +
            "WHERE checked_at >= NOW() - INTERVAL 1 HOUR AND is_available = 1 " +
            "AND tool_id IN (SELECT tool_id FROM tools WHERE server_id = ?)" :
            "SELECT COUNT(DISTINCT tool_id) as count FROM tools_history " +
            "WHERE checked_at >= NOW() - INTERVAL 1 HOUR AND is_available = 1";

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            if (serverId != null) {
                stmt.setInt(1, serverId);
            }
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("count");
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting active tools count", e);
        }
        return 0;
    }

    private List<Map<String, Object>> getTopPerformingTools(Integer serverId, int limit, int hours) {
        String sql = "SELECT t.tool_name, COUNT(*) as request_count, " +
                    "AVG(rl.latency_ms) as avg_latency, " +
                    "SUM(CASE WHEN rl.status_code >= 200 AND rl.status_code < 300 THEN 1 ELSE 0 END) as success_count " +
                    "FROM request_logs rl " +
                    "INNER JOIN tools t ON rl.tool_id = t.tool_id " +
                    "WHERE rl.created_at >= NOW() - INTERVAL ? HOUR " +
                    (serverId != null ? "AND rl.server_id = ? " : "") +
                    "GROUP BY t.tool_id, t.tool_name " +
                    "ORDER BY request_count DESC " +
                    "LIMIT ?";

        List<Map<String, Object>> topTools = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            int paramIndex = 1;
            stmt.setInt(paramIndex++, hours);
            if (serverId != null) {
                stmt.setInt(paramIndex++, serverId);
            }
            stmt.setInt(paramIndex, limit);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> tool = new HashMap<>();
                    tool.put("toolName", rs.getString("tool_name"));
                    tool.put("requestCount", rs.getInt("request_count"));
                    tool.put("avgLatency", Math.round(rs.getDouble("avg_latency")));
                    tool.put("successCount", rs.getInt("success_count"));
                    
                    int total = rs.getInt("request_count");
                    int success = rs.getInt("success_count");
                    double successRate = total > 0 ? (success * 100.0 / total) : 0;
                    tool.put("successRate", Math.round(successRate * 10) / 10.0);
                    
                    topTools.add(tool);
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting top performing tools", e);
        }

        return topTools;
    }

    private List<Map<String, Object>> getSystemHealthData(Integer serverId, int hours) {
        // Get hourly request counts
        String sql = "SELECT " +
                    "DATE_FORMAT(created_at, '%H:00') as time_label, " +
                    "COUNT(*) as value " +
                    "FROM request_logs " +
                    "WHERE created_at >= NOW() - INTERVAL ? HOUR " +
                    (serverId != null ? "AND server_id = ? " : "") +
                    "GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') " +
                    "ORDER BY created_at";

        List<Map<String, Object>> healthData = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, hours);
            if (serverId != null) {
                stmt.setInt(2, serverId);
            }

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> dataPoint = new HashMap<>();
                    dataPoint.put("time", rs.getString("time_label"));
                    dataPoint.put("value", rs.getInt("value"));
                    healthData.add(dataPoint);
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting system health data", e);
        }

        return healthData;
    }

    private Integer parseIntOrNull(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode)
            throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}
