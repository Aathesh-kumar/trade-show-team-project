package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.ServerHistory;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.service.MonitoringService;
import com.tradeshow.pulse24x7.mcp.service.RequestLogService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.utils.AuthHeaderUtil;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/server/*")
public class ServerServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(ServerServlet.class);
    private ServerService serverService;
    private AuthTokenService authTokenService;
    private MonitoringService monitoringService;
    private RequestLogService requestLogService;

    @Override
    public void init() throws ServletException {
        super.init();
        serverService = new ServerService();
        authTokenService = new AuthTokenService();
        monitoringService = new MonitoringService();
        requestLogService = new RequestLogService();
        logger.info("ServerServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/all")) {
                handleGetAllServers(req, resp);
            } else if (pathInfo.equals("/statuses")) {
                handleGetServerStatuses(req, resp);
            } else if (pathInfo.equals("/history")) {
                handleGetServerHistory(req, resp);
            } else if (pathInfo.matches("/\\d+")) {
                handleGetServerByPath(req, resp, pathInfo);
            } else {
                handleGetServerById(req, resp);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/")) {
                handleRegisterServer(req, resp);
            } else if (pathInfo.equals("/test")) {
                handleTestServer(req, resp);
            } else if (pathInfo.equals("/monitor")) {
                handleMonitorServer(req, resp);
            } else if (pathInfo.equals("/ping")) {
                handlePingServer(req, resp);
            } else if (pathInfo.equals("/refresh-data")) {
                handleRefreshServerData(req, resp);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing POST request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        try {
            handleUpdateServer(req, resp);
        } catch (Exception e) {
            logger.error("Error processing PUT request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        try {
            handleDeleteServer(req, resp);
        } catch (Exception e) {
            logger.error("Error processing DELETE request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void initResponse(HttpServletResponse resp) {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
    }

    private void handleRegisterServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        JsonObject payload = ServletUtil.readJsonBody(req);
        String serverName = ServletUtil.getString(payload, "serverName", null);
        String serverUrl = ServletUtil.getString(payload, "serverUrl", null);
        String headerType = ServletUtil.getString(payload, "headerType", "Bearer");
        String accessToken = ServletUtil.getString(payload, "accessToken", null);
        String refreshToken = ServletUtil.getString(payload, "refreshToken", null);
        String expiresAtStr = ServletUtil.getString(payload, "expiresAt", null);
        String clientId = ServletUtil.getString(payload, "clientId", null);
        String clientSecret = ServletUtil.getString(payload, "clientSecret", null);
        String tokenEndpoint = ServletUtil.getString(payload, "tokenEndpoint", "https://accounts.zoho.in/oauth/v2/token");
        String oauthTokenLink = ServletUtil.getString(payload, "oauthTokenLink", null);
        Integer monitorIntervalMinutes = ServletUtil.getInteger(payload, "monitorIntervalMinutes", 30);

        if (serverName == null || serverName.isBlank()) {
            sendErrorResponse(resp, "Server name is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (serverUrl == null || serverUrl.isBlank()) {
            sendErrorResponse(resp, "Server URL is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (headerType == null || headerType.isBlank()) {
            sendErrorResponse(resp, "Header type is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (accessToken == null || accessToken.isBlank()) {
            sendErrorResponse(resp, "Access token is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            sendErrorResponse(resp, "Refresh token is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (clientId == null || clientId.isBlank()) {
            sendErrorResponse(resp, "Client ID is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (clientSecret == null || clientSecret.isBlank()) {
            sendErrorResponse(resp, "Client secret is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (tokenEndpoint == null || tokenEndpoint.isBlank()) {
            sendErrorResponse(resp, "Token endpoint is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        HttpResult result = HttpClientUtil.canPingServer(
                serverUrl,
                AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, accessToken),
                JsonUtil.createMCPRequest("ping", Map.of()).toString()
        );
        if (!result.isSuccess()) {
            sendErrorResponse(resp, "MCP ping failed: " + result.getErrorMessage(), HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = serverService.registerServer(userId, serverName, serverUrl, monitorIntervalMinutes);
        if (serverId == null) {
            Server existing = serverService.getServerByUrl(serverUrl, userId);
            if (existing == null) {
                sendErrorResponse(resp, "Server already exists or invalid data", HttpServletResponse.SC_CONFLICT);
                return;
            }
            serverId = existing.getServerId();
        }

        Timestamp expiresAt = parseTimestamp(expiresAtStr);
        authTokenService.saveToken(serverId, headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint, oauthTokenLink);

        monitoringService.monitorServer(serverId);
        Server server = serverService.getServerById(serverId, userId);
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("server", server);
        responseData.put("message", "Server registered successfully");
        sendSuccessResponse(resp, responseData);
    }

    private void handleGetServerById(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Server server = serverService.getServerById(serverId, userId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, server);
    }

    private void handleGetAllServers(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        List<Server> servers = serverService.getAllServers(userId);
        sendSuccessResponse(resp, servers);
    }

    private void handleGetServerStatuses(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        List<Server> servers = serverService.getAllServers(userId);
        List<Map<String, Object>> statuses = new java.util.ArrayList<>();
        for (Server server : servers) {
            List<ServerHistory> history = serverService.getServerHistory(server.getServerId(), 1);
            ServerHistory latest = history.isEmpty() ? null : history.get(0);
            Map<String, Object> row = new HashMap<>();
            row.put("serverId", server.getServerId());
            row.put("serverName", server.getServerName());
            row.put("serverUrl", server.getServerUrl());
            row.put("serverUp", latest != null && Boolean.TRUE.equals(latest.getServerUp()));
            row.put("toolCount", latest != null ? latest.getToolCount() : 0);
            row.put("checkedAt", latest != null ? latest.getCheckedAt() : null);
            statuses.add(row);
        }
        sendSuccessResponse(resp, statuses);
    }

    private void handleGetServerByPath(HttpServletRequest req, HttpServletResponse resp, String pathInfo) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(pathInfo.substring(1));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Server server = serverService.getServerById(serverId, userId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, server);
    }

    private void handleGetServerHistory(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        int hours = parseInt(req.getParameter("hours"), 24);
        List<ServerHistory> history = serverService.getServerHistoryLastHours(serverId, hours);
        Double uptimePercent = serverService.getUptimePercent(serverId);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("history", history);
        responseData.put("uptimePercent", uptimePercent);
        sendSuccessResponse(resp, responseData);
    }

    private void handleUpdateServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        String serverName = ServletUtil.getString(payload, "serverName", null);
        String serverUrl = ServletUtil.getString(payload, "serverUrl", null);
        Integer monitorIntervalMinutes = ServletUtil.getInteger(payload, "monitorIntervalMinutes", null);

        if (serverId == null || serverName == null || serverUrl == null) {
            sendErrorResponse(resp, "Missing required parameters", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (monitorIntervalMinutes == null) {
            Server existingServer = serverService.getServerById(serverId, userId);
            if (existingServer != null && existingServer.getMonitorIntervalMinutes() != null) {
                monitorIntervalMinutes = existingServer.getMonitorIntervalMinutes();
            } else {
                monitorIntervalMinutes = 30;
            }
        }

        boolean updated = serverService.updateServer(serverId, userId, serverName, serverUrl, monitorIntervalMinutes);
        if (!updated) {
            sendErrorResponse(resp, "Failed to update server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, serverService.getServerById(serverId, userId));
    }

    private void handleDeleteServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        boolean deleted = serverService.deleteServer(serverId, userId);
        if (!deleted) {
            sendErrorResponse(resp, "Failed to delete server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Server deleted successfully"));
    }

    private void handleMonitorServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
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

        boolean force = Boolean.parseBoolean(req.getParameter("force"));
        boolean executed = monitoringService.monitorServerIfDue(serverId, force);
        if (executed) {
            sendSuccessResponse(resp, Map.of("message", "Monitoring completed successfully", "executed", true));
            return;
        }
        sendSuccessResponse(resp, Map.of(
                "message", "Monitoring skipped because configured interval has not elapsed",
                "executed", false
        ));
    }

    private void handleTestServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String serverUrl = ServletUtil.getString(payload, "serverUrl", null);
        String headerType = ServletUtil.getString(payload, "headerType", "Bearer");
        String accessToken = ServletUtil.getString(payload, "accessToken", null);

        if (serverUrl == null || serverUrl.isBlank()) {
            sendErrorResponse(resp, "serverUrl is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        long start = System.currentTimeMillis();
        HttpResult result = HttpClientUtil.canPingServer(
                serverUrl,
                AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, accessToken),
                JsonUtil.createMCPRequest("ping", Map.of()).toString()
        );
        long latency = System.currentTimeMillis() - start;

        if (!result.isSuccess()) {
            sendErrorResponse(resp, "Server test failed: " + result.getErrorMessage(), HttpServletResponse.SC_BAD_GATEWAY);
            return;
        }

        sendSuccessResponse(resp, Map.of(
                "message", "Server is reachable",
                "latencyMs", latency
        ));
    }

    private void handlePingServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Server server = serverService.getServerById(serverId, userId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        AuthToken token = authTokenService.getToken(serverId);
        String accessToken = authTokenService.ensureValidAccessToken(serverId);
        String headerType = token != null ? token.getHeaderType() : "Bearer";
        JsonObject pingBody = JsonUtil.createMCPRequest("ping", Map.of());
        pingBody.addProperty("mcpServerUrl", server.getServerUrl());
        long start = System.currentTimeMillis();
        HttpResult result = HttpClientUtil.canPingServer(
                server.getServerUrl(),
                AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, accessToken),
                pingBody.toString()
        );
        long latency = System.currentTimeMillis() - start;

        int statusCode = result.isSuccess() ? HttpServletResponse.SC_OK : HttpServletResponse.SC_BAD_GATEWAY;
        String statusText = result.isSuccess() ? "OK" : "ERR";
        String errorMessage = result.isSuccess() ? null : result.getErrorMessage();
        JsonObject responsePayload = result.isSuccess()
                ? parseOrWrapJson(result.getResponseBody())
                : wrapError(errorMessage);

        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        null,
                        "Ping Server",
                        "POST",
                        statusCode,
                        statusText,
                        latency,
                        pingBody,
                        responsePayload,
                        errorMessage,
                        req.getHeader("User-Agent")
                )
        );

        if (!result.isSuccess()) {
            sendErrorResponse(resp, "Ping failed: " + errorMessage, HttpServletResponse.SC_BAD_GATEWAY);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Ping successful", "latencyMs", latency));
    }

    private void handleRefreshServerData(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Server server = serverService.getServerById(serverId, userId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        JsonObject requestPayload = new JsonObject();
        requestPayload.addProperty("serverId", serverId);
        requestPayload.addProperty("event", "refresh_server_data");
        requestPayload.addProperty("mcpServerUrl", server.getServerUrl());
        long start = System.currentTimeMillis();
        monitoringService.monitorServer(serverId);
        long latency = System.currentTimeMillis() - start;

        JsonObject responsePayload = new JsonObject();
        responsePayload.addProperty("message", "Server data refreshed");
        responsePayload.addProperty("latencyMs", latency);
        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        null,
                        "Refresh Server Data",
                        "POST",
                        HttpServletResponse.SC_OK,
                        "OK",
                        latency,
                        requestPayload,
                        responsePayload,
                        null,
                        req.getHeader("User-Agent")
                )
        );
        sendSuccessResponse(resp, Map.of("message", "Server data refreshed", "latencyMs", latency));
    }

    private Integer parseInt(String value) {
        try {
            return value == null ? null : Integer.parseInt(value);
        } catch (Exception e) {
            return null;
        }
    }

    private int parseInt(String value, int fallback) {
        Integer parsed = parseInt(value);
        return parsed == null ? fallback : parsed;
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

    private JsonObject parseOrWrapJson(String raw) {
        try {
            return com.google.gson.JsonParser.parseString(raw).getAsJsonObject();
        } catch (Exception e) {
            JsonObject wrapped = new JsonObject();
            wrapped.addProperty("raw", raw == null ? "" : raw);
            return wrapped;
        }
    }

    private JsonObject wrapError(String message) {
        JsonObject error = new JsonObject();
        error.addProperty("error", message == null ? "Request failed" : message);
        return error;
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
