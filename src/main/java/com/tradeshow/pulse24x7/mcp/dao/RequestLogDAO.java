package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.RequestLog;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RequestLogDAO {
    private static final Logger logger = LogManager.getLogger(RequestLogDAO.class);

    public boolean insert(RequestLog requestLog) {
        Connection con = null;
        try {
            con = DBConnection.getInstance().getConnection();
            con.setAutoCommit(false);
            try (PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_REQUEST_LOG, Statement.RETURN_GENERATED_KEYS)) {
                ps.setInt(1, requestLog.getServerId());
                if (requestLog.getToolId() == null) {
                    ps.setNull(2, java.sql.Types.INTEGER);
                } else {
                    ps.setInt(2, requestLog.getToolId());
                }
                ps.setString(3, requestLog.getToolName());
                ps.setString(4, requestLog.getMethod());
                ps.setInt(5, requestLog.getStatusCode());
                ps.setString(6, requestLog.getStatusText());
                ps.setLong(7, requestLog.getLatencyMs() == null ? 0 : requestLog.getLatencyMs());
                ps.setString(8, requestLog.getErrorMessage());
                ps.setLong(9, requestLog.getResponseSizeBytes() == null ? 0 : requestLog.getResponseSizeBytes());
                ps.setString(10, requestLog.getUserAgent());
                int inserted = ps.executeUpdate();
                if (inserted <= 0) {
                    con.rollback();
                    return false;
                }

                long requestLogId;
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (!keys.next()) {
                        con.rollback();
                        return false;
                    }
                    requestLogId = keys.getLong(1);
                }

                try (PreparedStatement payloadPs = con.prepareStatement(DBQueries.INSERT_REQUEST_LOG_PAYLOAD)) {
                    payloadPs.setLong(1, requestLogId);
                    payloadPs.setString(2, requestLog.getRequestPayload());
                    payloadPs.setString(3, requestLog.getResponseBody());
                    payloadPs.executeUpdate();
                }
                con.commit();
                return true;
            }
        } catch (SQLException e) {
            if (con != null) {
                try {
                    con.rollback();
                } catch (SQLException ignored) {
                    // no-op
                }
            }
            logger.error("Failed to insert request log", e);
            return false;
        } finally {
            if (con != null) {
                try {
                    con.setAutoCommit(true);
                    con.close();
                } catch (SQLException ignored) {
                    // no-op
                }
            }
        }
    }

    public List<RequestLog> getLogs(Integer serverId, String search, Integer statusMin, Integer statusMax,
                                    String toolName, int hours, int limit, int offset) {
        StringBuilder query = new StringBuilder(DBQueries.SELECT_REQUEST_LOGS_WITH_PAYLOAD_BASE)
                .append(" WHERE rl.server_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(serverId);

        appendLogFilters(query, params, search, statusMin, statusMax, toolName, hours);
        query.append(" ORDER BY rl.created_at DESC LIMIT ? OFFSET ?");
        params.add(Math.max(1, limit));
        params.add(Math.max(0, offset));

        List<RequestLog> logs = new ArrayList<>();
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(query.toString())) {
            for (int i = 0; i < params.size(); i++) {
                Object value = params.get(i);
                if (value instanceof Integer) {
                    ps.setInt(i + 1, (Integer) value);
                } else if (value instanceof Timestamp) {
                    ps.setTimestamp(i + 1, (Timestamp) value);
                } else {
                    ps.setString(i + 1, String.valueOf(value));
                }
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    logs.add(mapResultSet(rs));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch request logs", e);
        }
        return logs;
    }

    public long countLogs(Integer serverId, String search, Integer statusMin, Integer statusMax,
                          String toolName, int hours) {
        StringBuilder query = new StringBuilder(DBQueries.COUNT_REQUEST_LOGS_BASE)
                .append(" WHERE rl.server_id = ?");
        List<Object> params = new ArrayList<>();
        params.add(serverId);
        appendLogFilters(query, params, search, statusMin, statusMax, toolName, hours);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(query.toString())) {
            bindParams(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("total");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to count request logs", e);
        }
        return 0;
    }

    public Map<String, Object> getStats(Integer serverId) {
        return getStats(serverId, null, null, null, null, 24 * 365);
    }

    public Map<String, Object> getStats(Integer serverId, String search, Integer statusMin, Integer statusMax,
                                        String toolName, int hours) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRequests", 0L);
        stats.put("totalSuccess", 0L);
        stats.put("totalWarnings", 0L);
        stats.put("totalErrors", 0L);

        StringBuilder query = new StringBuilder(
                "SELECT COUNT(*) total_requests, " +
                        "SUM(CASE WHEN rl.status_code >= 200 AND rl.status_code < 300 THEN 1 ELSE 0 END) total_success, " +
                        "SUM(CASE WHEN rl.status_code >= 400 AND rl.status_code < 500 THEN 1 ELSE 0 END) total_warnings, " +
                        "SUM(CASE WHEN rl.status_code >= 500 THEN 1 ELSE 0 END) total_errors " +
                        "FROM request_logs rl WHERE rl.server_id = ?"
        );
        List<Object> params = new ArrayList<>();
        params.add(serverId);
        appendLogFilters(query, params, search, statusMin, statusMax, toolName, hours);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(query.toString())) {
            bindParams(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    stats.put("totalRequests", rs.getLong("total_requests"));
                    stats.put("totalSuccess", rs.getLong("total_success"));
                    stats.put("totalWarnings", rs.getLong("total_warnings"));
                    stats.put("totalErrors", rs.getLong("total_errors"));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch request stats", e);
        }

        return stats;
    }

    public List<Map<String, Object>> getThroughput(Integer serverId, int hours, int bucketMinutes, int bucketSeconds) {
        int safeHours = Math.max(1, hours);
        int safeMinuteBucket = Math.max(1, bucketMinutes);
        int safeSecondBucket = Math.max(0, bucketSeconds);
        Timestamp since = timestampHoursAgo(safeHours);
        List<Map<String, Object>> points = new ArrayList<>();

        String query = safeSecondBucket > 0 ? DBQueries.SELECT_THROUGHPUT_BY_SECOND : DBQueries.SELECT_THROUGHPUT_BY_HOUR;
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(query)) {
            if (safeSecondBucket > 0) {
                ps.setInt(1, safeSecondBucket);
                ps.setInt(2, safeSecondBucket);
                ps.setInt(3, serverId);
                ps.setTimestamp(4, since);
            } else {
                ps.setInt(1, safeMinuteBucket);
                ps.setInt(2, serverId);
                ps.setTimestamp(3, since);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("time", safeSecondBucket > 0 ? rs.getString("second_bucket") : rs.getString("hour_bucket"));
                    row.put("value", rs.getLong("request_count"));
                    row.put("successCount", rs.getLong("success_count"));
                    row.put("warningCount", rs.getLong("warning_count"));
                    row.put("errorCount", rs.getLong("error_count"));
                    points.add(row);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch throughput points", e);
        }

        return points;
    }

    public List<Map<String, Object>> getTopTools(Integer serverId, int limit) {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.SELECT_TOP_TOOLS)) {
            ps.setInt(1, serverId);
            ps.setInt(2, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    row.put("toolName", rs.getString("tool_name"));
                    row.put("totalCalls", rs.getLong("total_calls"));
                    row.put("avgLatency", rs.getDouble("avg_latency"));
                    row.put("successPercent", rs.getDouble("success_percent"));
                    rows.add(row);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch top tools", e);
        }
        return rows;
    }

    private RequestLog mapResultSet(ResultSet rs) throws SQLException {
        RequestLog log = new RequestLog();
        log.setId(rs.getLong("id"));
        log.setServerId(rs.getInt("server_id"));
        int toolId = rs.getInt("tool_id");
        log.setToolId(rs.wasNull() ? null : toolId);
        log.setToolName(rs.getString("tool_name"));
        log.setMethod(rs.getString("method"));
        log.setStatusCode(rs.getInt("status_code"));
        log.setStatusText(rs.getString("status_text"));
        log.setLatencyMs(rs.getLong("latency_ms"));
        log.setRequestPayload(rs.getString("request_payload"));
        log.setResponseBody(rs.getString("response_body"));
        log.setErrorMessage(rs.getString("error_message"));
        log.setResponseSizeBytes(rs.getLong("response_size_bytes"));
        log.setUserAgent(rs.getString("user_agent"));
        String createdAtRaw = rs.getString("created_at");
        if (createdAtRaw != null && !createdAtRaw.isBlank()) {
            log.setCreatedAt(Timestamp.valueOf(createdAtRaw));
        } else {
            log.setCreatedAt(null);
        }
        return log;
    }

    private void appendLogFilters(StringBuilder query, List<Object> params, String search,
                                  Integer statusMin, Integer statusMax, String toolName, int hours) {
        if (search != null && !search.isBlank()) {
            query.append(" AND (rl.tool_name LIKE ? OR CAST(rl.id AS CHAR) LIKE ? OR rl.error_message LIKE ? OR rl.status_text LIKE ?)");
            String pattern = "%" + search + "%";
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }

        if (statusMin != null && statusMax != null) {
            query.append(" AND rl.status_code BETWEEN ? AND ?");
            params.add(statusMin);
            params.add(statusMax);
        }

        if (toolName != null && !toolName.isBlank()) {
            query.append(" AND rl.tool_name = ?");
            params.add(toolName);
        }

        query.append(" AND rl.created_at >= ?");
        params.add(timestampHoursAgo(hours));
    }

    private void bindParams(PreparedStatement ps, List<Object> params) throws SQLException {
        for (int i = 0; i < params.size(); i++) {
            Object value = params.get(i);
            if (value instanceof Integer) {
                ps.setInt(i + 1, (Integer) value);
            } else if (value instanceof Timestamp) {
                ps.setTimestamp(i + 1, (Timestamp) value);
            } else if (value instanceof Long) {
                ps.setLong(i + 1, (Long) value);
            } else {
                ps.setString(i + 1, String.valueOf(value));
            }
        }
    }

    private Timestamp timestampHoursAgo(int hours) {
        int safeHours = Math.max(1, hours);
        return Timestamp.from(Instant.now().minusSeconds(safeHours * 3600L));
    }
}
