package com.tradeshow.pulse24x7.mcp.utils;

public class DBQueries {
        private static final String TOOL_ANALYTICS_FILTER =
                "tool_name IS NOT NULL AND TRIM(tool_name) <> '' " +
                "AND tool_name NOT LIKE '\\\\_\\\\_%' ESCAPE '\\\\' " +
                "AND LOWER(tool_name) NOT LIKE '%tools/list%' " +
                "AND LOWER(tool_name) NOT LIKE '%ping%' " +
                "AND LOWER(tool_name) NOT LIKE '%refresh%' " +
                "AND LOWER(tool_name) NOT LIKE '%token%'";

        // Server Queries
        public static final String INSERT_SERVER =
                "INSERT INTO servers (user_id, server_name, server_url, monitor_interval_minutes) VALUES (?, ?, ?, ?)";

        public static final String GET_SERVER_BY_ID =
                "SELECT * FROM servers WHERE server_id = ? AND user_id = ?";

        public static final String GET_SERVER_BY_ID_GLOBAL =
                "SELECT * FROM servers WHERE server_id = ?";

        public static final String GET_SERVER_BY_URL =
                "SELECT * FROM servers WHERE server_url = ? AND user_id = ?";

        public static final String GET_ALL_SERVERS =
                "SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC";

        public static final String GET_ALL_SERVERS_GLOBAL =
                "SELECT * FROM servers ORDER BY created_at DESC";

        public static final String UPDATE_SERVER =
                "UPDATE servers SET server_name = ?, server_url = ?, monitor_interval_minutes = ? WHERE server_id = ? AND user_id = ?";

        public static final String DELETE_SERVER =
                "DELETE FROM servers WHERE server_id = ? AND user_id = ?";

        // Tool Queries
        public static final String INSERT_TOOL =
                "INSERT INTO tools (tool_name, tool_description, tool_type, input_schema, output_schema, server_id) " +
                        "VALUES (?, ?, ?, ?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE " +
                        "    tool_description = VALUES(tool_description), " +
                        "    tool_type = VALUES(tool_type), " +
                        "    input_schema = VALUES(input_schema), " +
                        "    output_schema = VALUES(output_schema), " +
                        "    is_availability = TRUE, " +
                        "    last_modify = CURRENT_TIMESTAMP";

        public static final String GET_TOOL_BY_ID =
                "SELECT * FROM tools WHERE tool_id = ?";

        public static final String GET_TOOLS_BY_SERVER =
                "SELECT * FROM tools WHERE server_id = ? ORDER BY create_at DESC";
        public static final String GET_TOOLS_BY_SERVER_SNAPSHOT =
                "SELECT t.tool_id, t.tool_name, t.tool_description, t.tool_type, t.input_schema, t.output_schema, " +
                        "COALESCE(last_hist.is_available, CASE WHEN t.last_modify <= ? THEN t.is_availability ELSE TRUE END) AS is_availability, " +
                        "t.total_requests, t.success_requests, t.last_status_code, t.last_latency_ms, t.create_at, t.last_modify, t.server_id " +
                        "FROM tools t " +
                        "LEFT JOIN (" +
                        "   SELECT h.tool_id, h.is_available " +
                        "   FROM tools_history h " +
                        "   INNER JOIN (" +
                        "       SELECT tool_id, MAX(checked_at) AS max_checked_at " +
                        "       FROM tools_history " +
                        "       WHERE checked_at <= ? " +
                        "       GROUP BY tool_id" +
                        "   ) m ON m.tool_id = h.tool_id AND m.max_checked_at = h.checked_at" +
                        ") last_hist ON last_hist.tool_id = t.tool_id " +
                        "WHERE t.server_id = ? AND t.create_at <= ? " +
                        "ORDER BY t.create_at DESC";

        public static final String GET_AVAILABLE_TOOLS =
                "SELECT * FROM tools " +
                        "WHERE server_id = ? AND is_availability = TRUE " +
                        "ORDER BY create_at DESC";

        public static final String UPDATE_TOOL_AVAILABILITY =
                "UPDATE tools SET is_availability = ?, last_modify = CURRENT_TIMESTAMP " +
                        "WHERE tool_id = ?";

        public static final String UPDATE_TOOL_REQUEST_METRICS =
                "UPDATE tools SET " +
                        "total_requests = total_requests + 1, " +
                        "success_requests = success_requests + CASE WHEN ? THEN 1 ELSE 0 END, " +
                        "last_status_code = ?, " +
                        "last_latency_ms = ?, " +
                        "last_modify = CURRENT_TIMESTAMP " +
                        "WHERE tool_id = ?";

        public static final String DISABLE_MISSING_TOOLS =
                "UPDATE tools SET is_availability = FALSE, last_modify = CURRENT_TIMESTAMP " +
                        "WHERE server_id = ? AND tool_name NOT IN (%s)";
        public static final String DISABLE_ALL_TOOLS_BY_SERVER =
                "UPDATE tools SET is_availability = FALSE, last_modify = CURRENT_TIMESTAMP WHERE server_id = ?";

        public static final String GET_TOOL_ID_BY_NAME_AND_SERVER =
                "SELECT tool_id FROM tools WHERE tool_name = ? AND server_id = ?";

        // Server History Queries
        public static final String INSERT_SERVER_HISTORY =
                "INSERT INTO server_history (server_id, server_up, tool_count) " +
                        "VALUES (?, ?, ?)";

        public static final String GET_SERVER_HISTORY =
                "SELECT * FROM server_history " +
                        "WHERE server_id = ? " +
                        "ORDER BY checked_at DESC " +
                        "LIMIT ?";

        public static final String GET_SERVER_HISTORY_RANGE =
                "SELECT * FROM server_history " +
                        "WHERE server_id = ? AND checked_at >= ? AND checked_at <= ? " +
                        "ORDER BY checked_at DESC";

        public static final String GET_LAST_SERVER_STATUS =
                "SELECT server_up FROM server_history " +
                        "WHERE server_id = ? " +
                        "ORDER BY checked_at DESC " +
                        "LIMIT 1";

        public static final String GET_LAST_TOOL_COUNT =
                "SELECT tool_count FROM server_history " +
                        "WHERE server_id = ? " +
                        "ORDER BY checked_at DESC " +
                        "LIMIT 1";

        public static final String GET_LAST_SERVER_HISTORY =
                "SELECT server_up, tool_count, checked_at FROM server_history " +
                        "WHERE server_id = ? ORDER BY checked_at DESC LIMIT 1";

        public static final String GET_TOTAL_CHECKS =
                "SELECT COUNT(*) AS total_checks " +
                        "FROM server_history " +
                        "WHERE server_id = ?";

        public static final String GET_UPTIME_PERCENT =
                "SELECT (SUM(CASE WHEN server_up = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS uptime_percent " +
                        "FROM server_history " +
                        "WHERE server_id = ?";

        public static final String GET_SERVER_HISTORY_LAST_HOURS =
                "SELECT * FROM server_history " +
                        "WHERE server_id = ? AND checked_at >= ? " +
                        "ORDER BY checked_at DESC";

        // Tool History Queries
        public static final String INSERT_TOOL_HISTORY =
                "INSERT INTO tools_history (tool_id, is_available) " +
                        "VALUES (?, ?)";

        public static final String GET_TOOL_HISTORY =
                "SELECT * FROM tools_history " +
                        "WHERE tool_id = ? " +
                        "ORDER BY checked_at DESC " +
                        "LIMIT ?";

        public static final String GET_TOOL_HISTORY_RANGE =
                "SELECT * FROM tools_history " +
                        "WHERE tool_id = ? AND checked_at >= ? AND checked_at <= ? " +
                        "ORDER BY checked_at DESC";

        public static final String GET_TOOL_HISTORY_LAST_HOURS =
                "SELECT * FROM tools_history " +
                        "WHERE tool_id = ? AND checked_at >= ? " +
                        "ORDER BY checked_at DESC";

        public static final String GET_TOOL_AVAILABILITY_PERCENT =
                "SELECT (SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS availability_percent " +
                        "FROM tools_history " +
                        "WHERE tool_id = ?";

        // Auth Token Queries
        public static final String INSERT_AUTH_TOKEN =
                "INSERT INTO auth_token (server_id, header_type, access_token, refresh_token, expires_at, client_id, client_secret, token_endpoint, oauth_token_link) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE " +
                        "    header_type = COALESCE(NULLIF(VALUES(header_type), ''), header_type, 'Bearer')," +
                        "    access_token = VALUES(access_token), " +
                        "    refresh_token = COALESCE(NULLIF(VALUES(refresh_token), ''), refresh_token), " +
                        "    expires_at = VALUES(expires_at), " +
                        "    client_id = COALESCE(NULLIF(VALUES(client_id), ''), client_id), " +
                        "    client_secret = COALESCE(NULLIF(VALUES(client_secret), ''), client_secret), " +
                        "    token_endpoint = COALESCE(NULLIF(VALUES(token_endpoint), ''), token_endpoint), " +
                        "    oauth_token_link = COALESCE(NULLIF(VALUES(oauth_token_link), ''), oauth_token_link), " +
                        "    updated_at = CURRENT_TIMESTAMP";

        public static final String GET_AUTH_TOKEN =
                "SELECT * FROM auth_token WHERE server_id = ?";

        public static final String UPDATE_ACCESS_TOKEN =
                "UPDATE auth_token SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP " +
                        "WHERE server_id = ?";

        public static final String DELETE_AUTH_TOKEN =
                "DELETE FROM auth_token WHERE server_id = ?";

        public static final String GET_EXPIRED_TOKENS =
                "SELECT * FROM auth_token WHERE expires_at IS NOT NULL AND expires_at < NOW()";

        // Request Logs Queries
        public static final String INSERT_REQUEST_LOG =
                "INSERT INTO request_logs (server_id, tool_id, tool_name, method, status_code, status_text, latency_ms, " +
                        "error_message, response_size_bytes, user_agent) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        public static final String INSERT_REQUEST_LOG_PAYLOAD =
                "INSERT INTO request_log_payloads (request_log_id, request_payload, response_body) VALUES (?, ?, ?)";


        public static final String SELECT_REQUEST_LOGS_WITH_PAYLOAD_BASE =
                "SELECT rl.id, rl.server_id, rl.tool_id, rl.tool_name, rl.method, rl.status_code, rl.status_text, rl.latency_ms, " +
                        "rl.error_message, rl.response_size_bytes, rl.user_agent, rl.created_at, " +
                        "COALESCE(rp.request_payload, '{}') AS request_payload, COALESCE(rp.response_body, '{}') AS response_body " +
                        "FROM request_logs rl " +
                        "LEFT JOIN request_log_payloads rp ON rp.request_log_id = rl.id";

        public static final String SELECT_REQUEST_STATS =
                "SELECT COUNT(*) total_requests, " +
                        "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) total_success, " +
                        "SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) total_warnings, " +
                        "SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) total_errors " +
                        "FROM request_logs WHERE server_id = ?";

        public static final String SELECT_THROUGHPUT_BY_HOUR =
                "SELECT DATE_FORMAT(DATE_SUB(created_at, INTERVAL (MINUTE(created_at) % ?) MINUTE), '%Y-%m-%d %H:%i:00') hour_bucket, " +
                        "COUNT(*) request_count, " +
                        "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) success_count, " +
                        "SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) warning_count, " +
                        "SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) error_count " +
                        "FROM request_logs WHERE server_id = ? AND created_at >= ? " +
                        "GROUP BY hour_bucket ORDER BY hour_bucket ASC";
        public static final String SELECT_THROUGHPUT_BY_SECOND =
                "SELECT DATE_FORMAT(FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / ?) * ?), '%Y-%m-%d %H:%i:%s') second_bucket, " +
                        "COUNT(*) request_count, " +
                        "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) success_count, " +
                        "SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) warning_count, " +
                        "SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) error_count " +
                        "FROM request_logs WHERE server_id = ? AND created_at >= ? " +
                        "GROUP BY second_bucket ORDER BY second_bucket ASC";

        public static final String SELECT_TOP_TOOLS =
                "SELECT tool_name, COUNT(*) total_calls, " +
                        "AVG(latency_ms) avg_latency, " +
                        "(SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) / COUNT(*)) * 100 success_percent " +
                        "FROM request_logs " +
                        "WHERE server_id = ? AND " + TOOL_ANALYTICS_FILTER + " " +
                        "GROUP BY tool_name " +
                        "ORDER BY total_calls DESC " +
                        "LIMIT ?";


        public static final String INSERT_NOTIFICATION =
                "INSERT INTO notifications (server_id, category, severity, title, message) VALUES (?, ?, ?, ?, ?)";

        public static final String SELECT_NOTIFICATIONS =
                "SELECT id, server_id, category, severity, title, message, is_read, created_at " +
                        "FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?";

        public static final String DELETE_NOTIFICATION =
                "DELETE FROM notifications WHERE id = ?";

        public static final String DELETE_ALL_NOTIFICATIONS =
                "DELETE FROM notifications";

        public static final String COUNT_REQUEST_LOGS_BASE =
                "SELECT COUNT(*) total FROM request_logs rl";

        public static final String EXISTS_TOOL_HISTORY_SINCE =
                "SELECT 1 FROM tools_history WHERE tool_id = ? AND checked_at >= ? LIMIT 1";
        public static final String EXISTS_TOOL_AVAILABLE_HISTORY_SINCE =
                "SELECT 1 FROM tools_history WHERE tool_id = ? AND checked_at >= ? AND is_available = TRUE LIMIT 1";

        public static final String MARK_NOTIFICATION_READ =
                "UPDATE notifications SET is_read = TRUE WHERE id = ?";

        public static final String MARK_ALL_NOTIFICATIONS_READ =
                "UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE";

        public static final String COUNT_UNREAD_NOTIFICATIONS =
                "SELECT COUNT(*) unread_count FROM notifications WHERE is_read = FALSE";

        public static final String GET_PAST_TOOL =
                "SELECT t.tool_id, t.tool_name, th.checked_at, th.is_available FROM tools_history th JOIN tools t ON th.tool_id = t.tool_id WHERE t.server_id = 1   AND th.checked_at >= NOW() - INTERVAL 60*2+10 MINUTE   AND th.checked_at <  NOW() - INTERVAL 60*2+5 MINUTE ORDER BY th.checked_at DESC";
        private DBQueries() {
        }
}
