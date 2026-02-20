package com.tradeshow.pulse24x7.mcp.db;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DBConnection {
    private static final Logger logger = LogManager.getLogger(DBConnection.class);
    private static DBConnection instance;
    private static volatile boolean schemaChecked = false;
    private static final Object SCHEMA_LOCK = new Object();

    private static final String DEFAULT_URL = "jdbc:mysql://localhost:3306/Pulse24x7?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
    private static final String DEFAULT_USER = "root";
    private static final String DEFAULT_PASSWORD = "aathesh";

    private DBConnection() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            logger.info("MySQL JDBC driver loaded");
        } catch (ClassNotFoundException e) {
            logger.error("MySQL Driver not found", e);
            throw new RuntimeException(e);
        }
    }

    public static synchronized DBConnection getInstance() {
        if (instance == null) {
            instance = new DBConnection();
        }
        return instance;
    }

    public Connection getConnection() {
        String url = getEnv("MCP_DB_URL", DEFAULT_URL);
        String user = getEnv("MCP_DB_USER", DEFAULT_USER);
        String password = getEnv("MCP_DB_PASSWORD", DEFAULT_PASSWORD);

        try {
            Connection con = DriverManager.getConnection(url, user, password);
            ensureSchemaUpgrades(con);
            return con;
        } catch (SQLException e) {
            logger.error("Failed to get database connection", e);
            throw new RuntimeException("Failed to connect to database", e);
        }
    }

    private String getEnv(String key, String fallback) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    public void closeConnection() {
        // no-op: connections are created per call and closed by try-with-resources in DAOs
    }

    private void ensureSchemaUpgrades(Connection con) {
        if (schemaChecked) {
            return;
        }
        synchronized (SCHEMA_LOCK) {
            if (schemaChecked) {
                return;
            }
            try {
                if (!tableExists(con, "users")) {
                    try (Statement st = con.createStatement()) {
                        st.executeUpdate(
                                "CREATE TABLE users (" +
                                        "id BIGINT PRIMARY KEY AUTO_INCREMENT," +
                                        "full_name VARCHAR(120) NOT NULL," +
                                        "email VARCHAR(180) NOT NULL UNIQUE," +
                                        "password_hash VARCHAR(255) NOT NULL," +
                                        "role VARCHAR(50) NOT NULL DEFAULT 'ADMIN'," +
                                        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
                                        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
                                        ")"
                        );
                    }
                }

                if (tableExists(con, "servers") && !columnExists(con, "servers", "user_id")) {
                    try (Statement st = con.createStatement()) {
                        st.executeUpdate("ALTER TABLE servers ADD COLUMN user_id BIGINT NULL");
                    }
                }

                if (tableExists(con, "servers")) {
                    Long fallbackUserId = getAnyUserId(con);
                    if (fallbackUserId == null) {
                        createDefaultUser(con);
                        fallbackUserId = getAnyUserId(con);
                    }
                    if (fallbackUserId != null && columnExists(con, "servers", "user_id")) {
                        try (PreparedStatement ps = con.prepareStatement(
                                "UPDATE servers SET user_id = ? WHERE user_id IS NULL OR user_id = 0")) {
                            ps.setLong(1, fallbackUserId);
                            ps.executeUpdate();
                        }
                    }
                    if (columnExists(con, "servers", "user_id")) {
                        try (Statement st = con.createStatement()) {
                            st.executeUpdate("ALTER TABLE servers MODIFY COLUMN user_id BIGINT NOT NULL");
                        } catch (SQLException ignored) {
                            // column may already be NOT NULL
                        }
                        if (!constraintExists(con, "servers", "fk_servers_user")) {
                            try (Statement st = con.createStatement()) {
                                st.executeUpdate("ALTER TABLE servers ADD CONSTRAINT fk_servers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
                            }
                        }
                        if (!indexExists(con, "servers", "uk_servers_user_url")) {
                            try (Statement st = con.createStatement()) {
                                st.executeUpdate("CREATE UNIQUE INDEX uk_servers_user_url ON servers(user_id, server_url)");
                            }
                        }
                    }
                }

                schemaChecked = true;
            } catch (SQLException e) {
                logger.error("Failed to apply DB schema upgrades", e);
            }
        }
    }

    private boolean tableExists(Connection con, String tableName) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, tableName);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private boolean columnExists(Connection con, String tableName, String columnName) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, tableName);
            ps.setString(2, columnName);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private boolean constraintExists(Connection con, String tableName, String constraintName) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, tableName);
            ps.setString(2, constraintName);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private boolean indexExists(Connection con, String tableName, String indexName) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, tableName);
            ps.setString(2, indexName);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private Long getAnyUserId(Connection con) throws SQLException {
        try (Statement st = con.createStatement();
             ResultSet rs = st.executeQuery("SELECT id FROM users ORDER BY id ASC LIMIT 1")) {
            if (rs.next()) {
                return rs.getLong(1);
            }
        }
        return null;
    }

    private void createDefaultUser(Connection con) throws SQLException {
        String sql = "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'ADMIN')";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, "Default Admin");
            ps.setString(2, "admin@pulse24x7.local");
            ps.setString(3, "migrated-placeholder");
            ps.executeUpdate();
        }
    }
}
