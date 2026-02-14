package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.ServerHistory;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.service.MonitoringService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
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
        System.out.println(System.getProperty("user.dir"));

    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("GET request to ServerServlet: {}", req.getPathInfo());

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/")) {
                // Get server by ID
                handleGetServerById(req, resp);
            } else if (pathInfo.equals("/all")) {
                // Get all servers
                handleGetAllServers(req, resp);
            } else if (pathInfo.equals("/history")) {
                // Get server history
                handleGetServerHistory(req, resp);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("POST request to ServerServlet: {}", req.getPathInfo());

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/")) {
                // Register new server
                handleRegisterServer(req, resp);
            } else if (pathInfo.equals("/monitor")) {
                // Trigger manual monitoring
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
    protected void doPut(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("PUT request to ServerServlet");

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        try {
            handleUpdateServer(req, resp);
        } catch (Exception e) {
            logger.error("Error processing PUT request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("DELETE request to ServerServlet");

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        try {
            handleDeleteServer(req, resp);
        } catch (Exception e) {
            logger.error("Error processing DELETE request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }


    private void handleRegisterServer(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        System.out.println(req.getRequestURL());
        String serverName = req.getParameter("serverName");
        System.out.println(serverName);

        String serverUrl = req.getParameter("serverUrl");
        String accessToken = req.getParameter("accessToken");
        String refreshToken = req.getParameter("refreshToken");
        String expiresAtStr = req.getParameter("expiresAt");

        if (serverName == null || serverName.trim().isEmpty()) {
            sendErrorResponse(resp, "Server name is required and cannot be empty", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            sendErrorResponse(resp, "Server URL is required and must be valid", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Integer serverId = serverService.registerServer(serverName, serverUrl);

        if (serverId == null) {
            sendErrorResponse(resp,"Server with this URL already exists", HttpServletResponse.SC_CONFLICT);
            return;
        }

        // Save auth token if provided
        if (accessToken != null && !accessToken.trim().isEmpty()) {
            Timestamp expiresAt = null;
            if (expiresAtStr != null && !expiresAtStr.trim().isEmpty()) {
                expiresAt = TimeUtil.parseTimestamp(expiresAtStr);
            }
            authTokenService.saveToken(serverId, accessToken, refreshToken, expiresAt);
        }

        // Get the created server
        Server server = serverService.getServerById(serverId);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("server", server);
        responseData.put("message", "Server registered successfully");

        sendSuccessResponse(resp, responseData);
    }

    private void handleGetServerById(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("id");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            Server server = serverService.getServerById(serverId);

            if (server == null) {
                sendErrorResponse(resp,  "Server not found", HttpServletResponse.SC_NOT_FOUND);
                return;
            }

            sendSuccessResponse(resp, server);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }


    private void handleGetAllServers(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        List<Server> servers = serverService.getAllServers();
        sendSuccessResponse(resp, servers);
    }

    private void handleGetServerHistory(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("id");
        String hoursStr = req.getParameter("hours");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            int hours = hoursStr != null ? Integer.parseInt(hoursStr) : 24; // Default 24 hours

            List<ServerHistory> history = serverService.getServerHistoryLastHours(serverId, hours);
            Double uptimePercent = serverService.getUptimePercent(serverId);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("history", history);
            responseData.put("uptimePercent", uptimePercent);

            sendSuccessResponse(resp, responseData);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid parameters", HttpServletResponse.SC_BAD_REQUEST);
        }
    }


    private void handleUpdateServer(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("id");
        String serverName = req.getParameter("serverName");
        String serverUrl = req.getParameter("serverUrl");

        if (serverIdStr == null || serverName == null || serverUrl == null) {
            sendErrorResponse(resp, "Missing required parameters", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            boolean updated = serverService.updateServer(serverId, serverName, serverUrl);

            if (updated) {
                Server server = serverService.getServerById(serverId);
                sendSuccessResponse(resp, server);
            } else {
                sendErrorResponse(resp, "Failed to update server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleDeleteServer(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("id");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            boolean deleted = serverService.deleteServer(serverId);

            if (deleted) {
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("message", "Server deleted successfully");
                sendSuccessResponse(resp, responseData);
            } else {
                sendErrorResponse(resp, "Failed to delete server", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } catch (NumberFormatException e) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleMonitorServer(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("id");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            monitoringService.monitorServer(serverId);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("message", "Monitoring completed successfully");
            sendSuccessResponse(resp, responseData);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp,"Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
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