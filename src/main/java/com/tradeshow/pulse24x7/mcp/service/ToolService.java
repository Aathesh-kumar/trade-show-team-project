package com.tradeshow.pulse24x7.mcp.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.ToolDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.model.ToolHistory;
import com.tradeshow.pulse24x7.mcp.utils.Constants;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import org.apache.hc.core5.http.ContentType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ToolService {
    private static final Logger logger = LogManager.getLogger(ToolService.class);
    private final ToolDAO toolDAO;
    private final ToolHistoryDAO toolHistoryDAO;
    private final AuthTokenService authTokenService;

    public ToolService() {
        this.toolDAO = new ToolDAO();
        this.toolHistoryDAO = new ToolHistoryDAO();
        this.authTokenService = new AuthTokenService();
    }

    public List<Tool> fetchAndUpdateTools(Integer serverId, String serverUrl, String accessToken) {
        logger.info("Fetching tools from server ID: {}", serverId);
        
        try {
            Map<String, Object> params = new HashMap<>();
            JsonObject request = JsonUtil.createMCPRequest("tools/list", params);

            Map<String, String> headers = new HashMap<>();
            headers.put("Content-Type", String.valueOf(ContentType.APPLICATION_JSON));
            if (accessToken != null && !accessToken.isEmpty()) {
                headers.put("Authorization", "Zoho-oauthtoken " + accessToken);
            }

            JsonObject response = HttpClientUtil.doPost(serverUrl, headers, request.toString());

            List<Tool> tools = parseToolsFromResponse(response, serverId);
            
            // Update database
            updateToolsInDatabase(serverId, tools);
            
            return tools;
            
        } catch (Exception e) {
            logger.error("Failed to fetch tools from server ID: {}", serverId, e);
            return List.of();
        }
    }

    private List<Tool> parseToolsFromResponse(JsonObject response, Integer serverId) {
        List<Tool> tools = new ArrayList<>();
        
        try {
            if (response.has("result") && response.get("result").isJsonObject()) {
                JsonObject result = response.getAsJsonObject("result");
                
                if (result.has("tools") && result.get("tools").isJsonArray()) {
                    JsonArray toolsArray = result.getAsJsonArray("tools");
                    
                    for (JsonElement toolElement : toolsArray) {
                        if (toolElement.isJsonObject()) {
                            JsonObject toolObj = toolElement.getAsJsonObject();
                            
                            String name = toolObj.has("name") ? toolObj.get("name").getAsString() : null;
                            String description = toolObj.has("description") 
                                    ? toolObj.get("description").getAsString() : "";
                            
                            if (name != null && !name.isEmpty()) {
                                Tool tool = new Tool();
                                tool.setToolName(name);
                                tool.setToolDescription(description);
                                tool.setServerId(serverId);
                                tool.setIsAvailability(true);
                                tools.add(tool);
                                
                                logger.debug("Parsed tool: {}", name);
                            }
                        }
                    }
                }
            }
            
            logger.info("Parsed {} tools from response", tools.size());
        } catch (Exception e) {
            logger.error("Failed to parse tools from response", e);
        }
        
        return tools;
    }

    private void updateToolsInDatabase(Integer serverId, List<Tool> tools) {
        logger.info("Updating {} tools for server ID: {}", tools.size(), serverId);
        
        // Insert/update each tool
        for (Tool tool : tools) {
            toolDAO.insertTool(tool.getToolName(), tool.getToolDescription(), serverId);
        }
        
        // Disable tools that are no longer available
        if (!tools.isEmpty()) {
            toolDAO.disableMissingTools(serverId, tools);
        }
    }

    public List<Tool> getToolsByServer(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return List.of();
        }
        return toolDAO.getToolsByServer(serverId);
    }

    public List<Tool> getAvailableTools(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return List.of();
        }
        return toolDAO.getAvailableTools(serverId);
    }

    public Tool getToolById(Integer toolId) {
        if (toolId == null || toolId <= 0) {
            logger.error("Invalid tool ID: {}", toolId);
            return null;
        }
        return toolDAO.getToolById(toolId);
    }

    public List<ToolHistory> getToolHistory(Integer toolId, int limit) {
        if (toolId == null || toolId <= 0) {
            logger.error("Invalid tool ID: {}", toolId);
            return List.of();
        }
        return toolHistoryDAO.getToolHistory(toolId, limit);
    }

    public List<ToolHistory> getToolHistoryLastHours(Integer toolId, int hours) {
        if (toolId == null || toolId <= 0 || hours <= 0) {
            logger.error("Invalid parameters: toolId={}, hours={}", toolId, hours);
            return List.of();
        }
        return toolHistoryDAO.getToolHistoryLastHours(toolId, hours);
    }

    public List<ToolHistory> getToolHistoryRange(Integer toolId, Timestamp startTime, 
                                                  Timestamp endTime) {
        if (toolId == null || toolId <= 0 || startTime == null || endTime == null) {
            logger.error("Invalid parameters for history range query");
            return List.of();
        }
        return toolHistoryDAO.getToolHistoryRange(toolId, startTime, endTime);
    }

    public Double getToolAvailabilityPercent(Integer toolId) {
        if (toolId == null || toolId <= 0) {
            return 0.0;
        }
        return toolHistoryDAO.getToolAvailabilityPercent(toolId);
    }

    public boolean recordToolHistory(Integer toolId, Boolean isAvailable) {
        if (toolId == null || toolId <= 0 || isAvailable == null) {
            logger.error("Invalid parameters for recording tool history");
            return false;
        }
        return toolHistoryDAO.insertHistory(toolId, isAvailable);
    }
}