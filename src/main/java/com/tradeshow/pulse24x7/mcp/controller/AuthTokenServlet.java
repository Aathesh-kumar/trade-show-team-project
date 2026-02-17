package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.ServletUtil;
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
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        AuthToken token = authTokenService.getToken(serverId);
        if (token == null) {
            sendErrorResponse(resp, "Token not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, token);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/refresh".equals(pathInfo)) {
            handleRefresh(req, resp);
            return;
        }
        handleSave(req, resp);
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }

        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        if (!authTokenService.deleteToken(serverId)) {
            sendErrorResponse(resp, "Failed to delete token", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Token deleted successfully"));
    }

    private void handleSave(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = ServletUtil.getInteger(payload, "serverId", null);
        String headerType = ServletUtil.getString(payload, "headerType", "Bearer");
        String accessToken = ServletUtil.getString(payload, "accessToken", null);
        String refreshToken = ServletUtil.getString(payload, "refreshToken", null);
        String expiresAtStr = ServletUtil.getString(payload, "expiresAt", null);
        String clientId = ServletUtil.getString(payload, "clientId", null);
        String clientSecret = ServletUtil.getString(payload, "clientSecret", null);
        String tokenEndpoint = ServletUtil.getString(payload, "tokenEndpoint", null);

        if (serverId == null || accessToken == null || accessToken.isBlank()) {
            sendErrorResponse(resp, "serverId and accessToken are required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Timestamp expiresAt = TimeUtil.parseTimestamp(expiresAtStr);
        boolean saved = authTokenService.saveToken(
                serverId, headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint
        );
        if (!saved) {
            sendErrorResponse(resp, "Failed to save token", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Token saved successfully"));
    }

    private void handleRefresh(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = ServletUtil.getInteger(payload, "serverId", parseInt(req.getParameter("serverId")));
        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            String newToken = authTokenService.refreshAccessToken(serverId);
            sendSuccessResponse(resp, Map.of("message", "Access token refreshed", "accessToken", newToken));
        } catch (Exception e) {
            sendErrorResponse(resp, e.getMessage(), HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private Integer parseInt(String value) {
        try {
            return value == null ? null : Integer.parseInt(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void initResponse(HttpServletResponse resp) {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode) throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}
