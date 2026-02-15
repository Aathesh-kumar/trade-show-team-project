package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.RequestLog;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class RequestLogDAO {
    private static final Logger logger = LogManager.getLogger(RequestLogDAO.class);

    /**
     * Create a new request log entry
     */
    public Long createRequestLog(RequestLog log) {
        String sql = "INSERT INTO request_logs (server_id, tool_id, method, endpoint, status_code, " +
                    "status_text, request_payload, response_body, latency_ms, response_size_kb, error_message) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setInt(1, log.getServerId());
            if (log.getToolId() != null) {
                stmt.setInt(2, log.getToolId());
            } else {
                stmt.setNull(2, Types.INTEGER);
            }
            stmt.setString(3, log.getMethod());
            stmt.setString(4, log.getEndpoint());
            stmt.setInt(5, log.getStatusCode());
            stmt.setString(6, log.getStatusText());
            stmt.setString(7, log.getRequestPayload());
            stmt.setString(8, log.getResponseBody());
            stmt.setInt(9, log.getLatencyMs());
            stmt.setDouble(10, log.getResponseSizeKb());
            stmt.setString(11, log.getErrorMessage());

            int affected = stmt.executeUpdate();
            if (affected > 0) {
                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        return rs.getLong(1);
                    }
                }
            }
        } catch (SQLException e) {
            logger.error("Error creating request log", e);
        }
        return null;
    }

    /**
     * Get all request logs with optional filters
     */
    public List<RequestLog> getAllRequestLogs(Integer serverId, Integer toolId, Integer statusCode, 
                                              Integer hours, Integer limit) {
        StringBuilder sql = new StringBuilder(
            "SELECT rl.*, t.tool_name, s.server_name " +
            "FROM request_logs rl " +
            "LEFT JOIN tools t ON rl.tool_id = t.tool_id " +
            "LEFT JOIN servers s ON rl.server_id = s.server_id " +
            "WHERE 1=1 "
        );

        List<Object> params = new ArrayList<>();

        if (serverId != null) {
            sql.append("AND rl.server_id = ? ");
            params.add(serverId);
        }

        if (toolId != null) {
            sql.append("AND rl.tool_id = ? ");
            params.add(toolId);
        }

        if (statusCode != null) {
            sql.append("AND rl.status_code = ? ");
            params.add(statusCode);
        }

        if (hours != null) {
            sql.append("AND rl.timestamp >= NOW() - INTERVAL ? HOUR ");
            params.add(hours);
        }

        sql.append("ORDER BY rl.timestamp DESC ");

        if (limit != null) {
            sql.append("LIMIT ?");
            params.add(limit);
        }

        List<RequestLog> logs = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql.toString())) {

            for (int i = 0; i < params.size(); i++) {
                stmt.setObject(i + 1, params.get(i));
            }

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    logs.add(extractRequestLogFromResultSet(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Error retrieving request logs", e);
        }

        return logs;
    }

    /**
     * Get request logs statistics
     */
    public Map<String, Object> getRequestLogsStats(Integer serverId, Integer hours) {
        String sql = "SELECT " +
                    "COUNT(*) as total_requests, " +
                    "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count, " +
                    "SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count, " +
                    "AVG(latency_ms) as avg_latency, " +
                    "MAX(latency_ms) as max_latency, " +
                    "MIN(latency_ms) as min_latency " +
                    "FROM request_logs " +
                    "WHERE server_id = ? " +
                    (hours != null ? "AND timestamp >= NOW() - INTERVAL ? HOUR" : "");

        Map<String, Object> stats = new HashMap<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, serverId);
            if (hours != null) {
                stmt.setInt(2, hours);
            }

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    stats.put("totalRequests", rs.getInt("total_requests"));
                    stats.put("successCount", rs.getInt("success_count"));
                    stats.put("errorCount", rs.getInt("error_count"));
                    stats.put("avgLatency", rs.getDouble("avg_latency"));
                    stats.put("maxLatency", rs.getInt("max_latency"));
                    stats.put("minLatency", rs.getInt("min_latency"));
                }
            }
        } catch (SQLException e) {
            logger.error("Error retrieving request logs stats", e);
        }

        return stats;
    }

    /**
     * Get unique tools from request logs
     */
    public List<String> getUniqueTools(Integer serverId) {
        String sql = "SELECT DISTINCT t.tool_name " +
                    "FROM request_logs rl " +
                    "INNER JOIN tools t ON rl.tool_id = t.tool_id " +
                    "WHERE rl.server_id = ? " +
                    "ORDER BY t.tool_name";

        List<String> tools = new ArrayList<>();

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, serverId);

            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    tools.add(rs.getString("tool_name"));
                }
            }
        } catch (SQLException e) {
            logger.error("Error retrieving unique tools", e);
        }

        return tools;
    }

    /**
     * Delete old request logs (cleanup)
     */
    public int deleteOldLogs(int daysToKeep) {
        String sql = "DELETE FROM request_logs WHERE timestamp < NOW() - INTERVAL ? DAY";

        try (Connection conn = DBConnection.getInstance().getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, daysToKeep);
            return stmt.executeUpdate();
        } catch (SQLException e) {
            logger.error("Error deleting old logs", e);
            return 0;
        }
    }

    /**
     * Extract RequestLog object from ResultSet
     */
    private RequestLog extractRequestLogFromResultSet(ResultSet rs) throws SQLException {
        RequestLog log = new RequestLog();
        log.setLogId(rs.getLong("log_id"));
        log.setServerId(rs.getInt("server_id"));
        
        int toolId = rs.getInt("tool_id");
        log.setToolId(rs.wasNull() ? null : toolId);
        
        log.setMethod(rs.getString("method"));
        log.setEndpoint(rs.getString("endpoint"));
        log.setStatusCode(rs.getInt("status_code"));
        log.setStatusText(rs.getString("status_text"));
        log.setRequestPayload(rs.getString("request_payload"));
        log.setResponseBody(rs.getString("response_body"));
        log.setLatencyMs(rs.getInt("latency_ms"));
        log.setResponseSizeKb(rs.getDouble("response_size_kb"));
        log.setTimestamp(rs.getTimestamp("timestamp"));
        log.setErrorMessage(rs.getString("error_message"));
        log.setToolName(rs.getString("tool_name"));
        log.setServerName(rs.getString("server_name"));
        
        return log;
    }
}