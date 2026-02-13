package com.tradeshow.pulse24x7.mcp.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
    private static DBConnection instance;
    private Connection connection;
    private static final String url = "jdbc:mysql://localhost:3306/Pulse24x7";
    private static final String user = "root";
    private static final String password = "aathesh";


    private DBConnection() {
        try{
            connection = DriverManager.getConnection(url, user, password);
        }catch(SQLException e) {
            System.out.println("Database Connection Failed!");


        }
    }

    public static DBConnection getInstance() {
        if(instance == null) {
            instance = new DBConnection();
        }
        return instance;
    }
    public Connection getConnection() {
        return connection;
    }
}
