package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.RequestLogDAO;
import com.tradeshow.pulse24x7.mcp.model.RequestLog;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebServlet("/logs/*")
public class RequestLogServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(RequestLogServlet.class);
    private RequestLogDAO requestLogDAO;

    @Override
    public void init() throws ServletException {
        super.init();
        requestLogDAO = new RequestLogDAO();
        logger.info("RequestLogServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("GET request to RequestLogServlet: {}", req.getPathInfo());

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/") || pathInfo.equals("/all")) {
                handleGetAllLogs(req, resp);
            } else if (pathInfo.equals("/stats")) {
                handleGetStats(req, resp);
            } else if (pathInfo.equals("/tools")) {
                handleGetUniqueTools(req, resp);
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
        logger.info("POST request to RequestLogServlet");

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        try {
            handleCreateLog(req, resp);
        } catch (Exception e) {
            logger.error("Error processing POST request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get all logs with filters
     * Query params: serverId, toolId, statusCode, hours, limit
     */
    private void handleGetAllLogs(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        JsonObject payload = HttpClientUtil.jsonParser(req);

        String serverIdStr = payload.get("serverId").getAsString();
        String toolIdStr = payload.get("toolId").getAsString();
        String statusCodeStr = payload.get("statusCode").getAsString();
        String hoursStr = payload.get("hours").getAsString();
        String limitStr = payload.get("limit").getAsString();

        Integer serverId = serverIdStr != null ? parseIntOrNull(serverIdStr) : null;
        Integer toolId = toolIdStr != null ? parseIntOrNull(toolIdStr) : null;
        Integer statusCode = statusCodeStr != null ? parseIntOrNull(statusCodeStr) : null;
        Integer hours = hoursStr != null ? parseIntOrNull(hoursStr) : Integer.valueOf(24); // Default 24 hours
        Integer limit = limitStr != null ? parseIntOrNull(limitStr) : Integer.valueOf(100); // Default 100

        List<RequestLog> logs = requestLogDAO.getAllRequestLogs(serverId, toolId, statusCode, hours, limit);

        Map<String, Object> response = new HashMap<>();
        response.put("logs", logs);
        response.put("totalCount", logs.size());

        sendSuccessResponse(resp, response);
    }

    /**
     * Get request logs statistics
     * Query params: serverId (required), hours
     */
    private void handleGetStats(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        JsonObject payload = HttpClientUtil.jsonParser(req);
        String serverIdStr = payload.get("serverId").getAsString();
        String hoursStr = payload.get("hours").getAsString();

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Server ID is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Integer serverId = parseIntOrNull(serverIdStr);
        Integer hours = hoursStr != null ? parseIntOrNull(hoursStr) : null;

        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Map<String, Object> stats = requestLogDAO.getRequestLogsStats(serverId, hours);
        sendSuccessResponse(resp, stats);
    }

    /**
     * Get unique tools for filter dropdown
     * Query params: serverId (required)
     */
    private void handleGetUniqueTools(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = HttpClientUtil.jsonParser(req).get("serverId").getAsString();

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Server ID is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Integer serverId = parseIntOrNull(serverIdStr);
        if (serverId == null) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        List<String> tools = requestLogDAO.getUniqueTools(serverId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("tools", tools);
        
        sendSuccessResponse(resp, response);
    }

    /**
     * Create a new request log
     * Form params: serverId, toolId, method, endpoint, statusCode, statusText, 
     *              latencyMs, responseSizeKb, requestPayload, responseBody
     */
    private void handleCreateLog(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        JsonObject payload = HttpClientUtil.jsonParser(req);
        String serverIdStr = payload.get("serverId").getAsString();
        String toolIdStr = payload.get("toolId").getAsString();
        String method = payload.get("method").getAsString();
        String endpoint = payload.get("endpoint").getAsString();
        String statusCodeStr = payload.get("statusCode").getAsString();
        String statusText = payload.get("statusText").getAsString();
        String latencyMsStr = payload.get("latencyMs").getAsString();
        String responseSizeKbStr = payload.get("responseSizeKb").getAsString();
        String requestPayload = payload.get("requestPayload").getAsString();
        String responseBody = payload.get("responseBody").getAsString();
        String errorMessage = payload.get("errorMessage").getAsString();

        // Validate required fields
        if (serverIdStr == null || method == null || endpoint == null || statusCodeStr == null) {
            sendErrorResponse(resp, "Missing required fields", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        RequestLog log = new RequestLog();
        log.setServerId(parseIntOrNull(serverIdStr));
        log.setToolId(toolIdStr != null ? parseIntOrNull(toolIdStr) : null);
        log.setMethod(method);
        log.setEndpoint(endpoint);
        log.setStatusCode(parseIntOrNull(statusCodeStr));
        log.setStatusText(statusText);
        log.setLatencyMs(latencyMsStr != null ? parseIntOrNull(latencyMsStr) : 0);
        log.setResponseSizeKb(responseSizeKbStr != null ? Double.parseDouble(responseSizeKbStr) : 0.0);
        log.setRequestPayload(requestPayload);
        log.setResponseBody(responseBody);
        log.setErrorMessage(errorMessage);

        if (!log.isValid()) {
            sendErrorResponse(resp, "Invalid log data", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Long logId = requestLogDAO.createRequestLog(log);

        if (logId != null) {
            Map<String, Object> response = new HashMap<>();
            response.put("logId", logId);
            response.put("message", "Request log created successfully");
            sendSuccessResponse(resp, response);
        } else {
            sendErrorResponse(resp, "Failed to create request log", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private Integer parseIntOrNull(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
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