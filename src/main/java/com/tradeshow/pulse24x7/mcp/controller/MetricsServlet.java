package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.ServerHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.service.RequestLogService;
import com.tradeshow.pulse24x7.mcp.service.ServerService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@WebServlet("/metrics/*")
public class MetricsServlet extends HttpServlet {
    private ServerService serverService;
    private RequestLogService requestLogService;
    private ServerHistoryDAO serverHistoryDAO;

    @Override
    public void init() throws ServletException {
        super.init();
        serverService = new ServerService();
        requestLogService = new RequestLogService();
        serverHistoryDAO = new ServerHistoryDAO();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();
        if (!"/overview".equals(pathInfo)) {
            sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Integer serverId = parseInt(req.getParameter("serverId"));
        if (serverId == null) {
            sendErrorResponse(resp, "serverId is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Long userId = getUserId(req);
        if (userId == null) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        if (serverService.getServerById(serverId, userId) == null) {
            sendErrorResponse(resp, "Server not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        int hours = parseInt(req.getParameter("hours"), 24);
        int bucketMinutes = parseInt(req.getParameter("bucketMinutes"), 30);
        int bucketSeconds = parseInt(req.getParameter("bucketSeconds"), 0);

        List<Server> servers = serverService.getAllServers(userId);
        Double uptimePercent = serverService.getUptimePercent(serverId);
        int activeServerCount = 0;
        for (Server server : servers) {
            Boolean isUp = serverHistoryDAO.getLastServerStatus(server.getServerId());
            if (Boolean.TRUE.equals(isUp)) {
                activeServerCount++;
            }
        }
        sendSuccessResponse(resp, requestLogService.getDashboardMetrics(
                serverId, activeServerCount, uptimePercent, hours, bucketMinutes, bucketSeconds
        ));
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
