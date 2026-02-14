package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.model.ToolHistory;
import com.tradeshow.pulse24x7.mcp.service.ToolService;
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

@WebServlet("/tool/*")
public class ToolServlet extends HttpServlet {
    private static final Logger logger = LogManager.getLogger(ToolServlet.class);
    private ToolService toolService;

    @Override
    public void init() throws ServletException {
        super.init();
        toolService = new ToolService();
        logger.info("ToolServlet initialized");
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        logger.info("GET request to ToolServlet: {}", req.getPathInfo());

        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));

        String pathInfo = req.getPathInfo();

        try {
            if (pathInfo == null || pathInfo.equals("/")) {
                handleGetToolsByServer(req, resp);
            } else if (pathInfo.equals("/active")) {
                handleGetActiveTools(req, resp);
            } else if (pathInfo.equals("/history")) {
                handleGetToolHistory(req, resp);
            } else if (pathInfo.matches("/\\d+")) {
                handleGetToolById(req, resp, pathInfo);
            } else {
                sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error processing GET request", e);
            sendErrorResponse(resp, "Internal server error", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleGetToolsByServer(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("serverId");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            List<Tool> tools = toolService.getToolsByServer(serverId);

            if (tools.isEmpty()) {
                logger.info("No tools found for server ID: {}", serverId);
            }

            sendSuccessResponse(resp, tools);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleGetActiveTools(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String serverIdStr = req.getParameter("serverId");

        if (serverIdStr == null || serverIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer serverId = Integer.parseInt(serverIdStr);
            List<Tool> tools = toolService.getAvailableTools(serverId);

            if (tools.isEmpty()) {
                logger.info("No active tools found for server ID: {}", serverId);
            }

            sendSuccessResponse(resp, tools);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid server ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleGetToolById(HttpServletRequest req, HttpServletResponse resp, String pathInfo)
            throws IOException {
        try {
            String toolIdStr = pathInfo.substring(1); // Remove leading '/'
            Integer toolId = Integer.parseInt(toolIdStr);

            Tool tool = toolService.getToolById(toolId);

            if (tool == null) {
                sendErrorResponse(resp, "Tool not found", HttpServletResponse.SC_NOT_FOUND);
                return;
            }

            sendSuccessResponse(resp, tool);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid tool ID", HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private void handleGetToolHistory(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String toolIdStr = req.getParameter("toolId");
        String hoursStr = req.getParameter("hours");

        if (toolIdStr == null || toolIdStr.trim().isEmpty()) {
            sendErrorResponse(resp, "Tool ID is required", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Integer toolId = Integer.parseInt(toolIdStr);
            int hours = hoursStr != null ? Integer.parseInt(hoursStr) : 24; // Default 24 hours

            List<ToolHistory> history = toolService.getToolHistoryLastHours(toolId, hours);
            Double availabilityPercent = toolService.getToolAvailabilityPercent(toolId);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("history", history);
            responseData.put("availabilityPercent", availabilityPercent);

            sendSuccessResponse(resp, responseData);
        } catch (NumberFormatException e) {
            sendErrorResponse(resp, "Invalid parameters", HttpServletResponse.SC_BAD_REQUEST);
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