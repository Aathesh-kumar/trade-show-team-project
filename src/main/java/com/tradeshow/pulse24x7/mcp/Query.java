package com.tradeshow.pulse24x7.mcp;

public class Query {
        public static final String INSERT_TOOL = "INSERT INTO tools (tool_name, tool_description, server_id)\n" +
                "VALUES (?, ?, ?)\n" +
                "ON DUPLICATE KEY UPDATE\n" +
                "    tool_description = VALUES(tool_description),\n" +
                "    is_availability = TRUE,\n" +
                "    last_modify = CURRENT_TIMESTAMP;";
        public static final String AVAILABLE_TOOLS = "SELECT *\n" +
                "FROM tools\n" +
                "WHERE server_id = ?\n" +
                "AND is_availability = TRUE;";
        public static final String INSERT_SERVER = "INSERT INTO servers (server_name, server_url)\n" +
                "VALUES (?,?);";
        public static final String GET_SERVER_BY_URL = "SELECT * FROM servers\n" +
                "WHERE server_url = ?;";
        public static final String INSERT_SERVER_HISTORY = "INSERT INTO server_history (server_id, server_up, tool_count)\n" +
                "VALUES (?, ?, ?);";
        public static final String LAST_SERVER_STATUS = "SELECT server_up\n" +
                "FROM server_history\n" +
                "WHERE server_id = ?\n" +
                "ORDER BY checked_at DESC\n" +
                "LIMIT 1;";
        public static final String LAST_TOOL_COUNT = "SELECT tool_count\n" +
                "FROM server_history\n" +
                "WHERE server_id = ?\n" +
                "ORDER BY checked_at DESC\n" +
                "LIMIT 1;";
        public static final String TOTAL_CHECK = "SELECT COUNT(*) AS total_checks\n" +
                "FROM server_history\n" +
                "WHERE server_id = ?;";
        public static final String UPTIME_PERCENT = "SELECT (SUM(CASE WHEN server_up = TRUE THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS uptime_percent\n" +
                "FROM server_history\n" +
                "WHERE server_id = ?;";
        public static final String INSERT_TOOL_HISTORY = "";
}
