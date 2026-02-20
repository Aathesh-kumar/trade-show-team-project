package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
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

@WebServlet("/dashboard/*")
public class DashboardServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(DashboardServlet.class);

    @Override
    public void init() throws ServletException {
        super.init();
        logger.info("DashboardServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String pathInfo = req.getPathInfo();
        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/stats")) {
                handleGetDashboardStats(req, resp, userId);
            } else if (pathInfo.equals("/top-tools")) {
                handleGetTopPerformingTools(req, resp, userId);
            } else if (pathInfo.equals("/system-health")) {
                handleGetSystemHealth(req, resp, userId);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleGetDashboardStats(HttpServletRequest req, HttpServletResponse resp, Long userId) throws IOException {
        Integer serverId = parseIntOrNull(req.getParameter("serverId"));
        if (serverId != null && !isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        Map<String, Object> stats = new HashMap<>();
        int totalServers = getTotalServersCount(userId);
        int activeServers = getActiveServersCount(userId);
        stats.put("totalServers", totalServers);
        stats.put("activeServers", activeServers);

        int totalTools = getTotalToolsCount(userId, serverId);
        int activeTools = getActiveToolsCount(userId, serverId);
        stats.put("totalTools", totalTools);
        stats.put("activeTools", activeTools);

        if (serverId != null) {
            Map<String, Object> requestStats = getRequestStats(serverId, userId);
            stats.putAll(requestStats);
        }

        sendSuccessResponse(resp, stats);
    }

    private void handleGetTopPerformingTools(HttpServletRequest req, HttpServletResponse resp, Long userId) throws IOException {
        Integer serverId = parseIntOrNull(req.getParameter("serverId"));
        Integer limit = parseIntOrNull(req.getParameter("limit"));
        Integer hours = parseIntOrNull(req.getParameter("hours"));

        int safeLimit = (limit == null || limit <= 0) ? 5 : limit;
        int safeHours = (hours == null || hours <= 0) ? 24 : hours;

        if (serverId != null && !isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        List<Map<String, Object>> topTools = getTopPerformingTools(userId, serverId, safeLimit, safeHours);
        Map<String, Object> response = new HashMap<>();
        response.put("tools", topTools);
        response.put("period", safeHours + " hours");
        sendSuccessResponse(resp, response);
    }

    private void handleGetSystemHealth(HttpServletRequest req, HttpServletResponse resp, Long userId) throws IOException {
        Integer serverId = parseIntOrNull(req.getParameter("serverId"));
        Integer hours = parseIntOrNull(req.getParameter("hours"));
        int safeHours = (hours == null || hours <= 0) ? 24 : hours;

        if (serverId != null && !isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        List<Map<String, Object>> healthData = getSystemHealthData(userId, serverId, safeHours);
        Map<String, Object> response = new HashMap<>();
        response.put("data", healthData);
        response.put("period", safeHours + " hours");
        sendSuccessResponse(resp, response);
    }

    private int getTotalServersCount(Long userId) {
        String sql = "SELECT COUNT(*) as count FROM servers WHERE user_id = ?";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("count");
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting total servers count", e);
        }
        return 0;
    }

    private int getActiveServersCount(Long userId) {
        String sql = "SELECT COUNT(DISTINCT sh.server_id) as count FROM server_history sh " +
                "INNER JOIN servers s ON s.server_id = sh.server_id " +
                "WHERE s.user_id = ? AND sh.checked_at >= NOW() - INTERVAL 1 HOUR AND sh.server_up = 1";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("count");
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting active servers count", e);
        }
        return 0;
    }

    private int getTotalToolsCount(Long userId, Integer serverId) {
        String sql = "SELECT COUNT(*) as count FROM tools t INNER JOIN servers s ON s.server_id = t.server_id " +
                "WHERE s.user_id = ? " + (serverId != null ? "AND t.server_id = ?" : "");
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, userId);
            if (serverId != null) {
                stmt.setInt(2, serverId);
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

    private int getActiveToolsCount(Long userId, Integer serverId) {
        String sql = "SELECT COUNT(DISTINCT th.tool_id) as count FROM tools_history th " +
                "INNER JOIN tools t ON t.tool_id = th.tool_id " +
                "INNER JOIN servers s ON s.server_id = t.server_id " +
                "WHERE s.user_id = ? AND th.checked_at >= NOW() - INTERVAL 1 HOUR AND th.is_available = 1 " +
                (serverId != null ? "AND t.server_id = ?" : "");

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setLong(1, userId);
            if (serverId != null) {
                stmt.setInt(2, serverId);
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

    private Map<String, Object> getRequestStats(Integer serverId, Long userId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", 0L);
        stats.put("totalSuccess", 0L);
        stats.put("totalErrors", 0L);

        String sql = "SELECT COUNT(*) total_requests, " +
                "SUM(CASE WHEN rl.status_code >= 200 AND rl.status_code < 300 THEN 1 ELSE 0 END) total_success, " +
                "SUM(CASE WHEN rl.status_code >= 400 THEN 1 ELSE 0 END) total_errors " +
                "FROM request_logs rl INNER JOIN servers s ON s.server_id = rl.server_id " +
                "WHERE rl.server_id = ? AND s.user_id = ?";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, serverId);
            stmt.setLong(2, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    stats.put("totalRequests", rs.getLong("total_requests"));
                    stats.put("totalSuccess", rs.getLong("total_success"));
                    stats.put("totalErrors", rs.getLong("total_errors"));
                }
            }
        } catch (SQLException e) {
            logger.error("Error getting request stats", e);
        }

        return stats;
    }

    private List<Map<String, Object>> getTopPerformingTools(Long userId, Integer serverId, int limit, int hours) {
        String sql = "SELECT t.tool_name, COUNT(*) as request_count, " +
                "AVG(rl.latency_ms) as avg_latency, " +
                "SUM(CASE WHEN rl.status_code >= 200 AND rl.status_code < 300 THEN 1 ELSE 0 END) as success_count " +
                "FROM request_logs rl " +
                "INNER JOIN tools t ON rl.tool_id = t.tool_id " +
                "INNER JOIN servers s ON s.server_id = rl.server_id " +
                "WHERE s.user_id = ? AND rl.created_at >= NOW() - INTERVAL ? HOUR " +
                (serverId != null ? "AND rl.server_id = ? " : "") +
                "GROUP BY t.tool_id, t.tool_name ORDER BY request_count DESC LIMIT ?";

        List<Map<String, Object>> topTools = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            int paramIndex = 1;
            stmt.setLong(paramIndex++, userId);
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

    private List<Map<String, Object>> getSystemHealthData(Long userId, Integer serverId, int hours) {
        String sql = "SELECT DATE_FORMAT(rl.created_at, '%H:00') as time_label, COUNT(*) as value " +
                "FROM request_logs rl " +
                "INNER JOIN servers s ON s.server_id = rl.server_id " +
                "WHERE s.user_id = ? AND rl.created_at >= NOW() - INTERVAL ? HOUR " +
                (serverId != null ? "AND rl.server_id = ? " : "") +
                "GROUP BY DATE_FORMAT(rl.created_at, '%Y-%m-%d %H:00:00') ORDER BY rl.created_at";

        List<Map<String, Object>> healthData = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setLong(1, userId);
            stmt.setInt(2, hours);
            if (serverId != null) {
                stmt.setInt(3, serverId);
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

    private boolean isServerOwnedByUser(Integer serverId, Long userId) {
        if (serverId == null || userId == null) {
            return false;
        }
        String sql = "SELECT 1 FROM servers WHERE server_id = ? AND user_id = ?";
        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, serverId);
            stmt.setLong(2, userId);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            logger.error("Error validating server ownership", e);
            return false;
        }
    }

    private Long getUserId(HttpServletRequest req) {
        Object uid = req.getAttribute("userId");
        return (uid instanceof Long) ? (Long) uid : null;
    }

    private Integer parseIntOrNull(String value) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return null;
        }
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode) throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}
