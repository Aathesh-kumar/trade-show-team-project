package com.tradeshow.pulse24x7.mcp.db;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
    private static final Logger logger = LogManager.getLogger(DBConnection.class);
    private static DBConnection instance;

    private static final String DEFAULT_URL = "jdbc:mysql://localhost:3306/Pulse24x7";
    private static final String DEFAULT_USER = "root";
    private static final String DEFAULT_PASSWORD = "Kasiragul97";

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
            return DriverManager.getConnection(url, user, password);
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
}
