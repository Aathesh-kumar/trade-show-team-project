package com.tradeshow.pulse24x7.mcp.db;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
    private static final Logger logger = LogManager.getLogger(DBConnection.class);
    private static DBConnection instance;
    private Connection connection;

    private static final String URL = "jdbc:mysql://localhost:3306/Pulse24x7";
    private static final String USER = "root";
    private static final String PASSWORD = "aathesh";

    private DBConnection() {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
            connection = DriverManager.getConnection(URL, USER, PASSWORD);
            logger.info("Database connection established successfully!");
        } catch (SQLException e) {
            logger.error("Failed to establish database connection", e);
            throw new RuntimeException(e);
        } catch (ClassNotFoundException e) {
            logger.error("MySQL Driver not found", e);
            throw new RuntimeException(e);
        }
    }

    public static synchronized DBConnection getInstance() {
        if (instance == null || isConnectionValid()) {
            instance = new DBConnection();
        }
        return instance;
    }

    public Connection getConnection() {
        try {
            if (connection == null || connection.isClosed()) {
                connection = DriverManager.getConnection(URL, USER, PASSWORD);
                logger.info("Database connection re-established");
            }
        } catch (SQLException e) {
            logger.error("Failed to get valid connection", e);
        }
        return connection;
    }

    private static boolean isConnectionValid() {
        try {
            return instance != null && instance.connection != null && !instance.connection.isClosed() && instance.connection.isValid(2);
        } catch (SQLException e) {
            logger.error("Connection validation failed", e);
            return false;
        }
    }

    public void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                logger.info("Database connection closed");
            }
        } catch (SQLException e) {
            logger.error("Error on closing database connection", e);
        }
    }
}
