package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.ServerDAO;
import com.tradeshow.pulse24x7.mcp.dao.ServerHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.ServerHistory;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.util.List;

public class ServerService {
    private static final Logger logger = LogManager.getLogger(ServerService.class);
    private final ServerDAO serverDAO;
    private final ServerHistoryDAO serverHistoryDAO;

    public ServerService() {
        this.serverDAO = new ServerDAO();
        this.serverHistoryDAO = new ServerHistoryDAO();
    }

    public Integer registerServer(String serverName, String serverUrl) {
        logger.info("Registering new server: {} - {}", serverName, serverUrl);
        
        // Validate inputs
        if (!validateServerName(serverName)) {
            logger.error("Invalid server name: {}", serverName);
            return null;
        }
        
        if (!validateServerUrl(serverUrl)) {
            logger.error("Invalid server URL: {}", serverUrl);
            return null;
        }
        
        // Check if server already exists
        if (serverDAO.serverExists(serverUrl)) {
            logger.warn("Server already exists with URL: {}", serverUrl);
            return null;
        }
        
        // Insert server
        return serverDAO.insertServer(serverName, serverUrl);
    }

    public Server getServerById(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return null;
        }
        return serverDAO.getServerById(serverId);
    }

    public Server getServerByUrl(String serverUrl) {
        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            logger.error("Invalid server URL");
            return null;
        }
        return serverDAO.getServerByUrl(serverUrl);
    }

    public List<Server> getAllServers() {
        return serverDAO.getAllServers();
    }

    public boolean updateServer(Integer serverId, String serverName, String serverUrl) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        
        if (!validateServerName(serverName) || !validateServerUrl(serverUrl)) {
            logger.error("Invalid server data for update");
            return false;
        }
        
        return serverDAO.updateServer(serverId, serverName, serverUrl);
    }

    public boolean deleteServer(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        return serverDAO.deleteServer(serverId);
    }

    public List<ServerHistory> getServerHistory(Integer serverId, int limit) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return List.of();
        }
        return serverHistoryDAO.getServerHistory(serverId, limit);
    }

    public List<ServerHistory> getServerHistoryLastHours(Integer serverId, int hours) {
        if (serverId == null || serverId <= 0 || hours <= 0) {
            logger.error("Invalid parameters: serverId={}, hours={}", serverId, hours);
            return List.of();
        }
        return serverHistoryDAO.getServerHistoryLastHours(serverId, hours);
    }

    public List<ServerHistory> getServerHistoryRange(Integer serverId, Timestamp startTime, 
                                                      Timestamp endTime) {
        if (serverId == null || serverId <= 0 || startTime == null || endTime == null) {
            logger.error("Invalid parameters for history range query");
            return List.of();
        }
        return serverHistoryDAO.getServerHistoryRange(serverId, startTime, endTime);
    }

    public Double getUptimePercent(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            return 0.0;
        }
        return serverHistoryDAO.getUptimePercent(serverId);
    }

    private boolean validateServerName(String serverName) {
        return serverName != null 
                && !serverName.trim().isEmpty() 
                && serverName.length() <= 100;
    }

    private boolean validateServerUrl(String serverUrl) {
        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            return false;
        }
        
        if (serverUrl.length() > 255) {
            return false;
        }

        return serverUrl.startsWith("http://") || serverUrl.startsWith("https://");
    }
}