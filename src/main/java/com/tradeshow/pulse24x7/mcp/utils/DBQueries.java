package com.tradeshow.pulse24x7.mcp.utils;

public class DBQueries {

        // Server Queries
        public static final String INSERT_SERVER =
                "INSERT INTO servers (server_name, server_url) VALUES (?, ?)";

        public static final String GET_SERVER_BY_ID =
                "SELECT * FROM servers WHERE server_id = ?";

        public static final String GET_SERVER_BY_URL =
                "SELECT * FROM servers WHERE server_url = ?";

        public static final String GET_ALL_SERVERS =
                "SELECT * FROM servers ORDER BY created_at DESC";

        public static final String UPDATE_SERVER =
                "UPDATE servers SET server_name = ?, server_url = ? WHERE server_id = ?";

        public static final String DELETE_SERVER =
                "DELETE FROM servers WHERE server_id = ?";

        // Tool Queries
        public static final String INSERT_TOOL =
                "INSERT INTO tools (tool_name, tool_description, server_id) " +
                        "VALUES (?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE " +
                        "    tool_description = VALUES(tool_description), " +
                        "    is_availability = TRUE, " +
                        "    last_modify = CURRENT_TIMESTAMP";

        public static final String GET_TOOL_BY_ID =
                "SELECT * FROM tools WHERE tool_id = ?";

        public static final String GET_TOOLS_BY_SERVER =
                "SELECT * FROM tools WHERE server_id = ? ORDER BY create_at DESC";

        public static final String GET_AVAILABLE_TOOLS =
                "SELECT * FROM tools " +
                        "WHERE server_id = ? AND is_availability = TRUE " +
                        "ORDER BY create_at DESC";

        public static final String UPDATE_TOOL_AVAILABILITY =
                "UPDATE tools SET is_availability = ?, last_modify = CURRENT_TIMESTAMP " +
                        "WHERE tool_id = ?";

        public static final String DISABLE_MISSING_TOOLS =
                "UPDATE tools SET is_availability = FALSE, last_modify = CURRENT_TIMESTAMP " +
                        "WHERE server_id = ? AND tool_name NOT IN (%s)";

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
                "INSERT INTO auth_token (server_id, access_token, refresh_token, expires_at) " +
                        "VALUES (?, ?, ?, ?) " +
                        "ON DUPLICATE KEY UPDATE " +
                        "    access_token = VALUES(access_token), " +
                        "    refresh_token = VALUES(refresh_token), " +
                        "    expires_at = VALUES(expires_at), " +
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

        private DBQueries() {
        }
}