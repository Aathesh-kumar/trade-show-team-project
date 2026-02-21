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

    public Integer registerServer(Long userId, String serverName, String serverUrl, Integer monitorIntervalMinutes) {
        logger.info("Registering new server for userId={}: {} - {}", userId, serverName, serverUrl);
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return null;
        }
        
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
        if (serverDAO.serverExists(serverUrl, userId)) {
            logger.warn("Server already exists with URL: {}", serverUrl);
            return null;
        }
        
        // Insert server
        if (!validateMonitorInterval(monitorIntervalMinutes)) {
            logger.error("Invalid monitor interval: {}", monitorIntervalMinutes);
            return null;
        }

        return serverDAO.insertServer(userId, serverName, serverUrl, monitorIntervalMinutes);
    }

    public Server getServerById(Integer serverId, Long userId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return null;
        }
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return null;
        }
        return serverDAO.getServerById(serverId, userId);
    }

    public Server getServerByIdGlobal(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return null;
        }
        return serverDAO.getServerByIdGlobal(serverId);
    }

    public Server getServerByUrl(String serverUrl, Long userId) {
        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            logger.error("Invalid server URL");
            return null;
        }
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return null;
        }
        return serverDAO.getServerByUrl(serverUrl, userId);
    }

    public List<Server> getAllServers(Long userId) {
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return List.of();
        }
        return serverDAO.getAllServers(userId);
    }

    public List<Server> getAllServersGlobal() {
        return serverDAO.getAllServersGlobal();
    }

    public boolean updateServer(Integer serverId, Long userId, String serverName, String serverUrl, Integer monitorIntervalMinutes) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return false;
        }
        
        if (!validateServerName(serverName) || !validateServerUrl(serverUrl) || !validateMonitorInterval(monitorIntervalMinutes)) {
            logger.error("Invalid server data for update");
            return false;
        }
        
        return serverDAO.updateServer(serverId, userId, serverName, serverUrl, monitorIntervalMinutes);
    }

    public boolean deleteServer(Integer serverId, Long userId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return false;
        }
        if (userId == null || userId <= 0) {
            logger.error("Invalid userId: {}", userId);
            return false;
        }
        return serverDAO.deleteServer(serverId, userId);
    }

    public boolean isServerOwnedByUser(Integer serverId, Long userId) {
        return getServerById(serverId, userId) != null;
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

    private boolean validateMonitorInterval(Integer monitorIntervalMinutes) {
        if (monitorIntervalMinutes == null) {
            return true;
        }
        return monitorIntervalMinutes >= 1 && monitorIntervalMinutes <= 1440;
    }
}
