package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.ServerHistoryDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.util.List;

public class MonitoringService {
    private static final Logger logger = LogManager.getLogger(MonitoringService.class);
    
    private final ServerService serverService;
    private final ToolService toolService;
    private final AuthTokenService authTokenService;
    private final ServerHistoryDAO serverHistoryDAO;
    private final ToolDAO toolDAO;
    private final ToolHistoryDAO toolHistoryDAO;

    public MonitoringService() {
        this.serverService = new ServerService();
        this.toolService = new ToolService();
        this.authTokenService = new AuthTokenService();
        this.serverHistoryDAO = new ServerHistoryDAO();
        this.toolDAO = new ToolDAO();
        this.toolHistoryDAO = new ToolHistoryDAO();
    }

    public void monitorServer(Integer serverId) {
        logger.info("Starting server monitoring for server ID: {}", serverId);
        
        try {
            Server server = serverService.getServerById(serverId);
            if (server == null) {
                logger.error("Server not found: " + serverId);
                return;
            }

            boolean serverUp = HttpClientUtil.isServerReachable(server.getServerUrl());
            logger.info("Server {} is {}", serverId, serverUp ? "UP" : "DOWN");
            
            // Get access token
            String accessToken = authTokenService.getAccessToken(serverId);
            
            int toolCount = 0;
            
            if (serverUp) {
                // Fetch and update tools
                List<Tool> tools = toolService.fetchAndUpdateTools(
                        serverId, 
                        server.getServerUrl(), 
                        accessToken
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
            
            logger.info("Server monitoring completed for server ID: {}", serverId);
            
        } catch (Exception e) {
            logger.error("Failed to monitor server ID: {}", serverId, e);
            serverHistoryDAO.insertHistory(serverId, false, 0);
        }
    }

    public void monitorAllServers() {
        logger.info("Starting monitoring for all servers");
        
        List<Server> servers = serverService.getAllServers();
        logger.info("Found {} servers to monitor", servers.size());
        
        for (Server server : servers) {
            try {
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
}