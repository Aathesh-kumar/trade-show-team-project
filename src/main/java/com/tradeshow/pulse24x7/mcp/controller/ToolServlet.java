package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.AuthToken;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.model.ToolHistory;
import com.tradeshow.pulse24x7.mcp.service.AuthTokenService;
import com.tradeshow.pulse24x7.mcp.service.RequestLogService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.service.ToolService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@WebServlet("/tool/*")
public class ToolServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(ToolServlet.class);
    private ToolService toolService;
    private ServerService serverService;
    private AuthTokenService authTokenService;
    private RequestLogService requestLogService;

    @Override
    public void init() throws ServletException {
        super.init();
        toolService = new ToolService();
        serverService = new ServerService();
        authTokenService = new AuthTokenService();
        requestLogService = new RequestLogService();
        logger.info("ToolServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/all")) {
                handleGetToolsByServer(req, resp);
            } else if (pathInfo.equals("/active")) {
                handleGetActiveTools(req,resp);
            } else if (pathInfo.equals("/history")) {
                handleGetToolHistory(req, resp);
            } else if (pathInfo.matches("/\\d+")) {
                handleGetToolById(resp, pathInfo);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
        String pathInfo = req.getPathInfo();

        try {
            if ("/refresh".equals(pathInfo)) {
                handleRefreshTools(req, resp);
            } else if ("/test".equals(pathInfo)) {
                handleTestTool(req, resp);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing POST request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleGetToolsByServer(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        boolean includeInactive = "true".equalsIgnoreCase(req.getParameter("includeInactive"));
        List<Tool> tools = includeInactive
                ? toolService.getToolsByServer(serverId)
                : toolService.getAvailableTools(serverId);
        Double hours = parseDouble(req.getParameter("hours"));
        String start = req.getParameter("start");
        String end = req.getParameter("end");
        if (hours != null && hours > 0) {
            Timestamp cutoff = Timestamp.from(Instant.now().minusSeconds((long) (hours * 3600)));
            tools = tools.stream()
                    .filter(t -> t.getLastModify() != null && t.getLastModify().after(cutoff))
                    .collect(Collectors.toList());
        } else if (start != null && end != null) {
            Timestamp startTs = parseTimestamp(start);
            Timestamp endTs = parseTimestamp(end);
            if (startTs != null && endTs != null) {
                tools = tools.stream()
                        .filter(t -> t.getLastModify() != null
                                && !t.getLastModify().before(startTs)
                                && !t.getLastModify().after(endTs))
                        .collect(Collectors.toList());
            }
        }
        sendSuccessResponse(resp, tools);
    }

    private void handleGetActiveTools(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        List<Tool> tools = toolService.getAvailableTools(serverId);
        sendSuccessResponse(resp, tools);
    }

    private void handleGetToolById(HttpServletResponse resp, String pathInfo) throws IOException {
        Integer toolId = parseInt(pathInfo.substring(1));
        if (toolId == null) {
            sendErrorResponse(resp, "Invalid tool ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Tool tool = toolService.getToolById(toolId);
        if (tool == null) {
            sendErrorResponse(resp, "Tool not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        sendSuccessResponse(resp, tool);
    }

    private void handleGetToolHistory(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Integer toolId = parseInt(req.getParameter("toolId"));
        if (toolId == null) {
            sendErrorResponse(resp, "Tool ID is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        int hours = parseInt(req.getParameter("hours"), 24);
        List<ToolHistory> history = toolService.getToolHistoryLastHours(toolId, hours);
        Double availabilityPercent = toolService.getToolAvailabilityPercent(toolId);

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("history", history);
        responseData.put("availabilityPercent", availabilityPercent);
        sendSuccessResponse(resp, responseData);
    }

    private void handleRefreshTools(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = ServletUtil.getInteger(payload, "serverId", null);

        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Server server = serverService.getServerById(serverId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        AuthToken token = authTokenService.getToken(serverId);
        String accessToken = authTokenService.ensureValidAccessToken(serverId);
        String headerType = token != null ? token.getHeaderType() : "Bearer";

        List<Tool> tools = toolService.fetchAndUpdateTools(serverId, server.getServerUrl(), accessToken, headerType);
        sendSuccessResponse(resp, tools);
    }

    private void handleTestTool(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = ServletUtil.getInteger(payload, "serverId", null);
        Integer toolId = ServletUtil.getInteger(payload, "toolId", null);
        String toolName = ServletUtil.getString(payload, "toolName", null);
        String inputParamsRaw = ServletUtil.getString(payload, "inputParams", "{}");

        if (serverId == null || toolName == null || toolName.isBlank()) {
            sendErrorResponse(resp, "serverId and toolName are required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Server server = serverService.getServerById(serverId);
        if (server == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        AuthToken token = authTokenService.getToken(serverId);
        String accessToken = authTokenService.ensureValidAccessToken(serverId);
        String headerType = token != null ? token.getHeaderType() : "Bearer";
        JsonObject inputParams = toolService.parseJsonObjectSafely(inputParamsRaw);

        long start = System.currentTimeMillis();
        JsonObject responseData;
        int statusCode = HttpServletResponse.SC_OK;
        String statusText = "OK";
        String errorMessage = null;

        try {
            responseData = toolService.executeTool(serverId, server.getServerUrl(), headerType, accessToken, toolName, inputParams);
        } catch (HttpClientUtil.HttpRequestException ex) {
            responseData = new JsonObject();
            responseData.addProperty("statusCode", ex.getStatusCode());
            if (ex.getErrorCode() != null) {
                responseData.addProperty("error_code", ex.getErrorCode());
            }
            responseData.addProperty("message", ex.getMessage());
            if (ex.getResponseBody() != null) {
                responseData.addProperty("raw", ex.getResponseBody());
            }
            statusCode = ex.getStatusCode() > 0 ? ex.getStatusCode() : HttpServletResponse.SC_BAD_GATEWAY;
            statusText = "ERR";
            errorMessage = ex.getMessage();
        } catch (Exception ex) {
            responseData = new JsonObject();
            responseData.addProperty("error", ex.getMessage());
            statusCode = HttpServletResponse.SC_BAD_GATEWAY;
            statusText = "ERR";
            errorMessage = ex.getMessage();
        }

        long latency = System.currentTimeMillis() - start;
        if (toolId != null) {
            toolService.trackToolRequest(toolId, statusCode, latency);
            toolService.recordToolHistory(toolId, statusCode >= 200 && statusCode < 300);
        }

        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        toolId,
                        toolName,
                        "POST",
                        statusCode,
                        statusText,
                        latency,
                        payload,
                        responseData,
                        errorMessage,
                        req.getHeader("User-Agent")
                )
        );

        if (statusCode >= 400) {
            String derivedMessage = errorMessage;
            if (responseData != null) {
                String code = responseData.has("error_code") ? responseData.get("error_code").getAsString() : null;
                String msg = responseData.has("message") ? responseData.get("message").getAsString() : null;
                if (msg == null && responseData.has("error")) {
                    msg = responseData.get("error").getAsString();
                }
                if (code != null && msg != null) {
                    derivedMessage = code + ": " + msg;
                } else if (msg != null) {
                    derivedMessage = msg;
                }
            }
            sendErrorResponse(resp, derivedMessage == null ? "Tool execution failed" : derivedMessage, statusCode);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("result", responseData);
            response.put("latencyMs", latency);
            sendSuccessResponse(resp, response);
        }
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

    private Double parseDouble(String value) {
        try {
            return value == null ? null : Double.parseDouble(value);
        } catch (Exception e) {
            return null;
        }
    }

    private Timestamp parseTimestamp(String value) {
        try {
            return Timestamp.from(Instant.parse(value));
        } catch (Exception e) {
            return null;
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
