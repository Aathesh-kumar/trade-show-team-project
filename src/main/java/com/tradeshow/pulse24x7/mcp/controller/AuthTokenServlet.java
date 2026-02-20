package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.ServletUtil;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@WebServlet("/auth/*")
public class AuthTokenServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(AuthTokenServlet.class);
    private AuthTokenService authTokenService;
    private ServerService serverService;

    @Override
    public void init() throws ServletException {
        super.init();
        authTokenService = new AuthTokenService();
        serverService = new ServerService();
        logger.info("AuthTokenServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
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
        JsonObject payload = ServletUtil.readJsonBody(req);
        String requestUri = req.getRequestURI() == null ? "" : req.getRequestURI();
        boolean refreshRoute = (pathInfo != null && pathInfo.startsWith("/refresh")) || requestUri.endsWith("/auth/refresh");
        boolean exchangeRoute = (pathInfo != null && pathInfo.startsWith("/exchange-code"))
                || requestUri.endsWith("/auth/exchange-code")
                || requestUri.contains("/auth/exchange-code");

        if (refreshRoute) {
            handleRefresh(payload, req, resp);
            return;
        }
        if (exchangeRoute) {
            handleCodeExchange(payload, req, resp);
            return;
        }
        if ((payload != null && payload.has("code") && payload.has("redirectUri"))
                || (req.getParameter("code") != null && req.getParameter("redirectUri") != null)) {
            handleCodeExchange(payload, req, resp);
            return;
        }
        if (payload != null && payload.has("serverId") && payload.has("refreshToken")
                && !payload.has("accessToken")) {
            sendErrorResponse(resp, "Access token missing. For OAuth flow use /auth/exchange-code.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        handleSave(payload, req, resp);
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }

        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        if (!authTokenService.deleteToken(serverId)) {
            sendErrorResponse(resp, "Failed to delete token", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Token deleted successfully"));
    }

    private void handleSave(JsonObject payload, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (payload == null) {
            payload = new JsonObject();
        }
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = ServletUtil.getInteger(payload, "serverId", null);
        String headerType = normalizeHeaderType(ServletUtil.getString(payload, "headerType", "Bearer"));
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
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        Timestamp expiresAt = parseTimestamp(expiresAtStr);
        boolean saved = authTokenService.saveToken(
                serverId, headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint
        );
        if (!saved) {
            sendErrorResponse(resp, "Failed to save token", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Token saved successfully"));
    }

    private void handleRefresh(JsonObject payload, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (payload == null) {
            payload = new JsonObject();
        }
        Integer serverId = ServletUtil.getInteger(payload, "serverId", parseInt(req.getParameter("serverId")));
        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        try {
            String newToken = authTokenService.refreshAccessToken(serverId);
            sendSuccessResponse(resp, Map.of("message", "Access token refreshed", "accessToken", newToken));
        } catch (Exception e) {
            sendErrorResponse(resp, e.getMessage(), HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleCodeExchange(JsonObject payload, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (payload == null) {
            payload = new JsonObject();
        }
        Integer serverId = ServletUtil.getInteger(payload, "serverId", parseInt(req.getParameter("serverId")));
        if (serverId == null) {
            String state = ServletUtil.getString(payload, "state", req.getParameter("state"));
            serverId = extractServerIdFromState(state);
        }
        String code = ServletUtil.getString(payload, "code", req.getParameter("code"));
        String redirectUri = ServletUtil.getString(payload, "redirectUri", req.getParameter("redirectUri"));
        String tokenEndpoint = ServletUtil.getString(payload, "tokenEndpoint", req.getParameter("tokenEndpoint"));

        if (serverId == null || code == null || code.isBlank() || redirectUri == null || redirectUri.isBlank()) {
            sendErrorResponse(resp, "serverId, code and redirectUri are required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        try {
            sendSuccessResponse(resp, authTokenService.exchangeAuthorizationCode(serverId, code, redirectUri, tokenEndpoint));
        } catch (HttpClientUtil.HttpRequestException e) {
            int mappedStatus = e.getStatusCode() >= 500 ? HttpServletResponse.SC_BAD_GATEWAY : HttpServletResponse.SC_BAD_REQUEST;
            sendErrorResponse(resp, e.getMessage(), mappedStatus);
        } catch (Exception e) {
            sendErrorResponse(resp, e.getMessage(), HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private Integer extractServerIdFromState(String state) {
        if (state == null || state.isBlank()) {
            return null;
        }
        try {
            String[] parts = state.split("_");
            if (parts.length < 3) {
                return null;
            }
            return Integer.parseInt(parts[2]);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer parseInt(String value) {
        try {
            return value == null ? null : Integer.parseInt(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Timestamp parseTimestamp(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Timestamp.from(Instant.parse(value));
        } catch (Exception ignored) {
            // fall through
        }
        try {
            LocalDateTime dt = LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            return Timestamp.valueOf(dt);
        } catch (Exception ignored) {
            // fall through
        }
        try {
            LocalDateTime dt = LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
            return Timestamp.valueOf(dt);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long getUserId(HttpServletRequest req) {
        Object uid = req.getAttribute("userId");
        return (uid instanceof Long) ? (Long) uid : null;
    }

    private String normalizeHeaderType(String headerType) {
        String value = headerType == null ? "" : headerType.trim();
        return value.isEmpty() ? "Bearer" : value;
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
