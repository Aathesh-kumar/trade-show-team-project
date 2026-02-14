package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.TimeUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.Map;


@WebServlet("/auth/*")
public class AuthTokenServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(AuthTokenServlet.class);
    private AuthTokenService authTokenService;

    @Override
    public void init() throws ServletException {
        super.init();
        authTokenService = new AuthTokenService();
        logger.info("AuthTokenServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        logger.info("GET request to AuthTokenServlet");

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
        
        String serverIdStr = req.getParameter("serverId");
        
        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        
        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            AuthToken token = authTokenService.getToken(serverId);
            
            if (token == null) {
                sendErrorResponse(resp, "Token not found", HttpServletResponse.SC_NOT_FOUND);
                return;
            }
            
            sendSuccessResponse(resp, token);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        logger.info("POST request to AuthTokenServlet");
        
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
        
        String serverIdStr = req.getParameter("serverId");
        String accessToken = req.getParameter("accessToken");
        String refreshToken = req.getParameter("refreshToken");
        String expiresAtStr = req.getParameter("expiresAt");
        
        // Validate
        if (refreshToken == null || accessToken == null || accessToken.trim().isEmpty() || refreshToken.trim().isEmpty()) {
            sendErrorResponse(resp, "Access token and refreshToken are required",
                    HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        
        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            Timestamp expiresAt = null;
            
            if (expiresAtStr != null && !expiresAtStr.trim().isEmpty()){
                expiresAt = TimeUtil.parseTimestamp(expiresAtStr);
            }

            boolean saved = authTokenService.saveToken(serverId, accessToken, refreshToken, expiresAt);
            
            if (saved) {
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("message", "Token saved successfully");
                sendSuccessResponse(resp, responseData);
            } else {
                sendErrorResponse(resp, "Failed to save token", 
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        logger.info("DELETE request to AuthTokenServlet");
        
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
        
        String serverIdStr = req.getParameter("serverId");
        
        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        
        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            boolean deleted = authTokenService.deleteToken(serverId);
            
            if (deleted) {
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("message", "Token deleted successfully");
                sendSuccessResponse(resp, responseData);
            } else {
                sendErrorResponse(resp, "Failed to delete token", 
                        HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode) 
            throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}