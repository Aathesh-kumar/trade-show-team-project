package com.tradeshow.pulse24x7.mcp.service;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.ServerHistoryDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.utils.AuthHeaderUtil;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.util.List;
import java.util.Map;
import java.sql.Timestamp;

public class MonitoringService {
    private static final Logger logger = LogManager.getLogger(MonitoringService.class);
    
    private final ServerService serverService;
    private final ToolService toolService;
    private final AuthTokenService authTokenService;
    private final ServerHistoryDAO serverHistoryDAO;
    private final ToolDAO toolDAO;
    private final ToolHistoryDAO toolHistoryDAO;
    private final NotificationService notificationService;
    private final RequestLogService requestLogService;

    public MonitoringService() {
        this.serverService = new ServerService();
        this.toolService = new ToolService();
        this.authTokenService = new AuthTokenService();
        this.serverHistoryDAO = new ServerHistoryDAO();
        this.toolDAO = new ToolDAO();
        this.toolHistoryDAO = new ToolHistoryDAO();
        this.notificationService = new NotificationService();
        this.requestLogService = new RequestLogService();
    }

    public void monitorServer(Integer serverId) {
        logger.info("Starting server monitoring for server ID: {}", serverId);
        
        try {
            Server server = serverService.getServerByIdGlobal(serverId);
            if (server == null) {
                logger.error("Server not found: " + serverId);
                return;
            }

            AuthToken authToken = authTokenService.getToken(serverId);
            String accessToken = authTokenService.ensureValidAccessToken(serverId);
            String headerType = authToken != null ? authToken.getHeaderType() : null;
            Boolean previousStatus = serverHistoryDAO.getLastServerStatus(serverId);

            HttpResult pingResult = pingAndLog(
                    serverId,
                    server.getServerUrl(),
                    AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, accessToken),
                    "primary"
            );
            if (!pingResult.isSuccess()
                    && accessToken != null
                    && !accessToken.isBlank()
                    && shouldAttemptTokenRefresh(serverId, pingResult)) {
                try {
                    String refreshedToken = authTokenService.refreshAccessToken(serverId);
                    pingResult = pingAndLog(
                            serverId,
                            server.getServerUrl(),
                            AuthHeaderUtil.withAuthHeaders(Map.of("Content-Type", "application/json"), headerType, refreshedToken),
                            "after_refresh"
                    );
                } catch (Exception ignored) {
                    // keep original ping failure
                }
            }
            boolean serverUp = pingResult.isSuccess();
            logger.info("Server {} is {}", serverId, serverUp ? "UP" : "DOWN");
            
            int toolCount = 0;
            
            if (serverUp) {
                // Fetch and update tools
                List<Tool> tools = toolService.fetchAndUpdateTools(
                        serverId, 
                        server.getServerUrl(), 
                        accessToken,
                        headerType
                );
                toolCount = tools.size();

                // Record tool history for each tool
                for (Tool tool : tools) {
                    Integer toolId = toolDAO.getToolIdByNameAndServer(tool.getToolName(), serverId);
                    if (toolId != null) {
                        toolHistoryDAO.insertHistory(toolId, true);
                    }
                }
                
                logger.info("Fetched {} tools from server {}", toolCount, serverId);
            }

            serverHistoryDAO.insertHistory(serverId, serverUp, toolCount);

            if (previousStatus == null || previousStatus != serverUp) {
                notificationService.notify(
                        serverId,
                        "server",
                        serverUp ? "info" : "error",
                        serverUp ? "Server is up" : "Server is down",
                        server.getServerName() + " is now " + (serverUp ? "reachable" : "unreachable")
                );
            }
            
            logger.info("Server monitoring completed for server ID: {}", serverId);
            
        } catch (Exception e) {
            logger.error("Failed to monitor server ID: {}", serverId, e);
            serverHistoryDAO.insertHistory(serverId, false, 0);
        }
    }

    public boolean monitorServerIfDue(Integer serverId, boolean force) {
        Server server = serverService.getServerByIdGlobal(serverId);
        if (server == null) {
            logger.warn("Skipping monitoring because server {} was not found", serverId);
            return false;
        }
        if (!force && !shouldMonitorNow(server)) {
            int intervalMinutes = Math.max(1, server.getMonitorIntervalMinutes() == null ? 30 : server.getMonitorIntervalMinutes());
            logger.info("Skipping monitor for server {} because configured interval ({} minutes) has not elapsed", serverId, intervalMinutes);
            return false;
        }
        monitorServer(serverId);
        return true;
    }

    private boolean shouldAttemptTokenRefresh(Integer serverId, HttpResult pingResult) {
        if (pingResult == null) {
            return false;
        }
        if (pingResult.getStatusCode() == 401 && authTokenService.isTokenExpired(serverId, 0)) {
            return true;
        }
        String lowerError = pingResult.getErrorMessage() == null ? "" : pingResult.getErrorMessage().toLowerCase();
        if (lowerError.contains("invalid_oauthtoken") || lowerError.contains("invalid oauth token")) {
            return true;
        }
        return false;
    }

    public void monitorAllServers() {
        logger.info("Starting monitoring for all servers");
        
        List<Server> servers = serverService.getAllServersGlobal();
        logger.info("Found {} servers to monitor", servers.size());
        
        for (Server server : servers) {
            try {
                if (!shouldMonitorNow(server)) {
                    continue;
                }
                monitorServer(server.getServerId());
            } catch (Exception e) {
                logger.error("Failed to monitor server ID: {}", server.getServerId(), e);
            }
        }
        
        logger.info("Completed monitoring for all servers");
    }

    public void checkToolAvailability(Integer serverId) {
        logger.info("Checking tool availability for server ID: {}", serverId);
        
        try {
            List<Tool> tools = toolDAO.getToolsByServer(serverId);
            
            for (Tool tool : tools) {
                // Record current availability in history
                toolHistoryDAO.insertHistory(tool.getToolId(), tool.getIsAvailability());
            }
            
            logger.info("Tool availability check completed for server ID: {}", serverId);
        } catch (Exception e) {
            logger.error("Failed to check tool availability for server ID: {}", serverId, e);
        }
    }

    private HttpResult pingAndLog(Integer serverId, String serverUrl, Map<String, String> headers, String stage) {
        JsonObject requestPayload = JsonUtil.createMCPRequest("ping", Map.of());
        requestPayload.addProperty("mcpServerUrl", serverUrl);
        requestPayload.addProperty("source", "monitoring");
        requestPayload.addProperty("stage", stage);

        long start = System.currentTimeMillis();
        HttpResult result = HttpClientUtil.canPingServer(serverUrl, headers, requestPayload.toString());
        long latency = Math.max(0L, System.currentTimeMillis() - start);
        int statusCode = result.getStatusCode() > 0 ? result.getStatusCode() : (result.isSuccess() ? 200 : 502);

        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        null,
                        "__MONITOR_PING__",
                        "POST",
                        statusCode,
                        result.isSuccess() ? "OK" : "ERR",
                        latency,
                        requestPayload,
                        parseOrWrapJson(result.getResponseBody(), result.getErrorMessage()),
                        result.isSuccess() ? null : result.getErrorMessage(),
                        "Pulse24x7-Monitor"
                )
        );
        return result;
    }

    private JsonObject parseOrWrapJson(String body, String errorMessage) {
        if (body == null || body.isBlank()) {
            JsonObject wrapped = new JsonObject();
            if (errorMessage != null && !errorMessage.isBlank()) {
                wrapped.addProperty("error", errorMessage);
            }
            return wrapped;
        }
        try {
            return com.google.gson.JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception e) {
            JsonObject wrapped = new JsonObject();
            wrapped.addProperty("raw", body);
            if (errorMessage != null && !errorMessage.isBlank()) {
                wrapped.addProperty("error", errorMessage);
            }
            return wrapped;
        }
    }

    private boolean shouldMonitorNow(Server server) {
        int intervalMinutes = Math.max(1, server.getMonitorIntervalMinutes() == null ? 30 : server.getMonitorIntervalMinutes());
        com.tradeshow.pulse24x7.mcp.model.ServerHistory lastHistory = serverHistoryDAO.getLastHistory(server.getServerId());
        if (lastHistory == null || lastHistory.getCheckedAt() == null) {
            return true;
        }
        Timestamp lastChecked = lastHistory.getCheckedAt();
        long elapsedMillis = System.currentTimeMillis() - lastChecked.getTime();
        return elapsedMillis >= intervalMinutes * 60_000L;
    }
}
