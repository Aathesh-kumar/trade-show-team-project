package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.RequestLog;
import com.tradeshow.pulse24x7.mcp.service.RequestLogService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
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

@WebServlet("/request-log/*")
public class RequestLogServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(RequestLogServlet.class);
    private RequestLogService requestLogService;
    private ServerService serverService;

    @Override
    public void init() throws ServletException {
        super.init();
        requestLogService = new RequestLogService();
        serverService = new ServerService();
        logger.info("RequestLogServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();
        try {
            if ("/stats".equals(pathInfo)) {
                handleStats(req, resp);
            } else {
                handleLogs(req, resp);
            }
        } catch (Exception e) {
            logger.error("Failed to process request log endpoint", e);
            sendErrorResponse(resp, "Failed to fetch request logs", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleLogs(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String search = req.getParameter("search");
        String status = req.getParameter("status");
        String tool = req.getParameter("tool");
        int hours = parseInt(req.getParameter("hours"), 24);
        int page = Math.max(1, parseInt(req.getParameter("page"), 1));
        int pageSize = Math.max(1, Math.min(500, parseInt(req.getParameter("limit"), 100)));
        int offset = (page - 1) * pageSize;

        List<RequestLog> logs = requestLogService.getLogs(serverId, search, status, tool, hours, pageSize, offset);
        long total = requestLogService.countLogs(serverId, search, status, tool, hours);

        Map<String, Object> response = new HashMap<>();
        response.put("logs", logs);
        response.put("stats", requestLogService.getStats(serverId));
        response.put("pagination", Map.of(
                "page", page,
                "pageSize", pageSize,
                "totalItems", total,
                "totalPages", Math.max(1, (int) Math.ceil((double) total / pageSize))
        ));
        sendSuccessResponse(resp, response);
    }

    private void handleStats(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, requestLogService.getStats(serverId));
    }

    private Integer parseInt(String value) {
        try {
            return value == null ? null : Integer.parseInt(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private int parseInt(String value, int fallback) {
        Integer parsed = parseInt(value);
        return parsed == null ? fallback : parsed;
    }

    private Long getUserId(HttpServletRequest req) {
        Object uid = req.getAttribute("userId");
        return (uid instanceof Long) ? (Long) uid : null;
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
