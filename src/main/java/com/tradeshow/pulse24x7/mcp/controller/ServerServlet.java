package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.ServerHistory;
import com.tradeshow.pulse24x7.mcp.utils.AuthHeaderUtil;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.service.MonitoringService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/server/*")
public class ServerServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(ServerServlet.class);
    private ServerService serverService;
    private AuthTokenService authTokenService;
    private MonitoringService monitoringService;

    @Override
    public void init() throws ServletException {
        super.init();
        serverService = new ServerService();
        authTokenService = new AuthTokenService();
        monitoringService = new MonitoringService();
        logger.info("ServerServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/all")) {
                handleGetAllServers(resp);
            } else if (pathInfo.equals("/history")) {
                handleGetServerHistory(req, resp);
            } else if (pathInfo.matches("/\\d+")) {
                handleGetServerByPath(resp, pathInfo);
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

        if (serverName == null || serverName.isBlank()) {
            sendErrorResponse(resp, "Server name is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (serverUrl == null || serverUrl.isBlank()) {
            sendErrorResponse(resp, "Server URL is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        if (accessToken != null && !accessToken.isBlank()) {
            HttpResult result = HttpClientUtil.canPingServer(
                    serverUrl,
                    AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, accessToken),
                    JsonUtil.createMCPRequest("ping", Map.of()).toString()
            );
            if (!result.isSuccess()) {
                sendErrorResponse(resp, "MCP ping failed: " + result.getErrorMessage(), HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        Integer serverId = serverService.registerServer(serverName, serverUrl);
        if (serverId == null) {
            Server existing = serverService.getServerByUrl(serverUrl);
            if (existing == null) {
                sendErrorResponse(resp, "Server already exists or invalid data", HttpServletResponse.SC_CONFLICT);
                return;
            }
            serverId = existing.getServerId();
        }

        if (accessToken != null && !accessToken.isBlank()) {
            Timestamp expiresAt = TimeUtil.parseTimestamp(expiresAtStr);
            authTokenService.saveToken(serverId, headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint);
        }

        monitoringService.monitorServer(serverId);
        Server server = serverService.getServerById(serverId);
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("server", server);
        responseData.put("message", "Server registered successfully");
        sendSuccessResponse(resp, responseData);
    }

    private void handleGetServerById(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Server server = serverService.getServerById(serverId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, server);
    }

    private void handleGetAllServers(HttpServletResponse resp) throws IOException {
        List<Server> servers = serverService.getAllServers();
        sendSuccessResponse(resp, servers);
    }

    private void handleGetServerByPath(HttpServletResponse resp, String pathInfo) throws IOException {
        Integer serverId = parseInt(pathInfo.substring(1));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Server server = serverService.getServerById(serverId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, server);
    }

    private void handleGetServerHistory(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
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
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        String serverName = ServletUtil.getString(payload, "serverName", null);
        String serverUrl = ServletUtil.getString(payload, "serverUrl", null);

        if (serverId == null || serverName == null || serverUrl == null) {
            sendErrorResponse(resp, "Missing required parameters", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        boolean updated = serverService.updateServer(serverId, serverName, serverUrl);
        if (!updated) {
            sendErrorResponse(resp, "Failed to update server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, serverService.getServerById(serverId));
    }

    private void handleDeleteServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        boolean deleted = serverService.deleteServer(serverId);
        if (!deleted) {
            sendErrorResponse(resp, "Failed to delete server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Server deleted successfully"));
    }

    private void handleMonitorServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("id"));
        if (serverId == null) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            serverId = ServletUtil.getInteger(payload, "serverId", null);
        }
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        monitoringService.monitorServer(serverId);
        sendSuccessResponse(resp, Map.of("message", "Monitoring completed successfully"));
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
