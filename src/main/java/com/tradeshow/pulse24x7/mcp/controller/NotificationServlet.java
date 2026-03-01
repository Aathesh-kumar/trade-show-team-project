package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.service.NotificationService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.ServletUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@WebServlet("/notification/*")
public class NotificationServlet extends HttpServlet {
    private NotificationService notificationService;
    private ServerService serverService;

    @Override
    public void init() throws ServletException {
        super.init();
        notificationService = new NotificationService();
        serverService = new ServerService();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        JsonObject payload = ServletUtil.readJsonBody(req);
        Integer serverId = payload.has("serverId") && !payload.get("serverId").isJsonNull()
                ? payload.get("serverId").getAsInt()
                : null;
        if (serverId != null && !serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        String category = payload.has("category") && !payload.get("category").isJsonNull()
                ? payload.get("category").getAsString()
                : null;
        String severity = payload.has("severity") && !payload.get("severity").isJsonNull()
                ? payload.get("severity").getAsString()
                : null;
        String title = payload.has("title") && !payload.get("title").isJsonNull()
                ? payload.get("title").getAsString()
                : null;
        String message = payload.has("message") && !payload.get("message").isJsonNull()
                ? payload.get("message").getAsString()
                : null;

        boolean ok = notificationService.notify(serverId, category, severity, title, message);
        if (!ok) {
            sendErrorResponse(resp, "Failed to create notification", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Notification created"));
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String pathInfo = req.getPathInfo();
        Integer serverId = parseInteger(req.getParameter("serverId"));
        if (serverId != null && !serverService.isServerOwnedByUser(serverId, userId)) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        if ("/unread-count".equals(pathInfo)) {
            sendSuccessResponse(resp, Map.of("unreadCount", notificationService.countUnreadByUser(userId, serverId)));
            return;
        }
        int limit = parseInt(req.getParameter("limit"), 50);
        int offset = parseInt(req.getParameter("offset"), 0);
        sendSuccessResponse(resp, notificationService.getRecentByUser(userId, serverId, limit, offset));
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String pathInfo = req.getPathInfo();
        if ("/read-all".equals(pathInfo)) {
            JsonObject payload = ServletUtil.readJsonBody(req);
            Integer serverId = ServletUtil.getInteger(payload, "serverId", parseInteger(req.getParameter("serverId")));
            if (serverId != null && !serverService.isServerOwnedByUser(serverId, userId)) {
                sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
                return;
            }
            int updated = notificationService.markAllReadByUser(userId, serverId);
            sendSuccessResponse(resp, Map.of("updated", updated));
            return;
        }
        JsonObject payload = ServletUtil.readJsonBody(req);
        Long id = payload.has("id") ? payload.get("id").getAsLong() : null;
        if (id == null) {
            sendErrorResponse(resp, "id is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        boolean ok = notificationService.markReadForUser(id, userId);
        if (!ok) {
            sendErrorResponse(resp, "Notification not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Notification marked as read"));
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String pathInfo = req.getPathInfo();

        if ("/all".equals(pathInfo)) {
            Integer serverId = parseInteger(req.getParameter("serverId"));
            if (serverId == null) {
                JsonObject payload = ServletUtil.readJsonBody(req);
                serverId = ServletUtil.getInteger(payload, "serverId", null);
            }
            if (serverId != null && !serverService.isServerOwnedByUser(serverId, userId)) {
                sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
                return;
            }
            int deleted = notificationService.clearAllByUser(userId, serverId);
            sendSuccessResponse(resp, Map.of("deleted", deleted));
            return;
        }

        Long id = parsePathId(pathInfo);
        if (id == null) {
            sendErrorResponse(resp, "Notification id is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        boolean deleted = notificationService.clearByIdForUser(id, userId);
        if (!deleted) {
            sendErrorResponse(resp, "Notification not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Notification cleared"));
    }

    private Long getUserId(HttpServletRequest req) {
        Object uid = req.getAttribute("userId");
        return (uid instanceof Long) ? (Long) uid : null;
    }

    private int parseInt(String value, int fallback) {
        try {
            return value == null ? fallback : Integer.parseInt(value);
        } catch (Exception e) {
            return fallback;
        }
    }

    private Integer parseInteger(String value) {
        try {
            return value == null ? null : Integer.parseInt(value);
        } catch (Exception e) {
            return null;
        }
    }

    private Long parsePathId(String pathInfo) {
        if (pathInfo == null || pathInfo.isBlank() || "/".equals(pathInfo)) {
            return null;
        }
        try {
            return Long.parseLong(pathInfo.substring(1));
        } catch (Exception e) {
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
