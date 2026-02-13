package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.utils.Constants;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.sql.Connection;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/health")
public class HealthCheckServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(HealthCheckServlet.class);

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        resp.setContentType(Constants.CONTENT_TYPE_JSON);
        resp.setCharacterEncoding("UTF-8");
        
        Map<String, Object> healthStatus = new HashMap<>();
        healthStatus.put("status", "UP");
        healthStatus.put("timestamp", System.currentTimeMillis());

        boolean dbHealthy = checkDatabaseHealth();
        healthStatus.put("database", dbHealthy ? "UP" : "DOWN");
        
        if (dbHealthy) {
            sendSuccessResponse(resp, healthStatus);
        } else {
            resp.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            healthStatus.put("status", "DEGRADED");
            resp.getWriter().write(JsonUtil.toJson(healthStatus));
        }
    }

    private boolean checkDatabaseHealth() {
        try {
            Connection conn = DBConnection.getInstance().getConnection();
            return conn != null && !conn.isClosed() && conn.isValid(2);
        } catch (Exception e) {
            logger.error("Database health check failed", e);
            return false;
        }
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }
}