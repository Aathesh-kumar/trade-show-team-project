package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.service.NotificationService;
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

    @Override
    public void init() throws ServletException {
        super.init();
        notificationService = new NotificationService();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/unread-count".equals(pathInfo)) {
            sendSuccessResponse(resp, Map.of("unreadCount", notificationService.countUnread()));
            return;
        }
        int limit = parseInt(req.getParameter("limit"), 50);
        sendSuccessResponse(resp, notificationService.getRecent(limit));
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/read-all".equals(pathInfo)) {
            int updated = notificationService.markAllRead();
            sendSuccessResponse(resp, Map.of("updated", updated));
            return;
        }
        JsonObject payload = ServletUtil.readJsonBody(req);
        Long id = payload.has("id") ? payload.get("id").getAsLong() : null;
        if (id == null) {
            sendErrorResponse(resp, "id is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        boolean ok = notificationService.markRead(id);
        if (!ok) {
            sendErrorResponse(resp, "Notification not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Notification marked as read"));
    }

    private int parseInt(String value, int fallback) {
        try {
            return value == null ? fallback : Integer.parseInt(value);
        } catch (Exception e) {
            return fallback;
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
