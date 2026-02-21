package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.utils.DBQueries;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ServerDAO {
    private static final Logger logger = LogManager.getLogger(ServerDAO.class);

    public Integer insertServer(Long userId, String serverName, String serverUrl, Integer monitorIntervalMinutes) {
        logger.info("Inserting server for userId={}: {} - {}", userId, serverName, serverUrl);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_SERVER, Statement.RETURN_GENERATED_KEYS)) {

            ps.setLong(1, userId);
            ps.setString(2, serverName);
            ps.setString(3, serverUrl);
            ps.setInt(4, normalizeMonitorInterval(monitorIntervalMinutes));

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                try (ResultSet rs = ps.getGeneratedKeys()) {
                    if (rs.next()) {
                        Integer serverId = rs.getInt(1);
                        logger.info("Server inserted successfully with ID: {}", serverId);
                        return serverId;
                    }
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to insert server: {} - {}", serverName, serverUrl, e);
        }
        return null;
    }

    public Server getServerById(Integer serverId, Long userId) {
        logger.debug("Fetching server by ID: {} for userId={}", serverId, userId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_BY_ID)) {

            ps.setInt(1, serverId);
            ps.setLong(2, userId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToServer(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch server by ID: {}", serverId, e);
        }
        return null;
    }

    public Server getServerByIdGlobal(Integer serverId) {
        logger.debug("Fetching server by ID globally: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_BY_ID_GLOBAL)) {

            ps.setInt(1, serverId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToServer(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch server by ID globally: {}", serverId, e);
        }
        return null;
    }

    public Server getServerByUrl(String serverUrl, Long userId) {
        logger.debug("Fetching server by URL: {} for userId={}", serverUrl, userId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_BY_URL)) {

            ps.setString(1, serverUrl);
            ps.setLong(2, userId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToServer(rs);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch server by URL: {}", serverUrl, e);
        }
        return null;
    }

    public List<Server> getAllServers(Long userId) {
        logger.debug("Fetching all servers for userId={}", userId);
        List<Server> servers = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_ALL_SERVERS)) {
            ps.setLong(1, userId);
            try (ResultSet rows = ps.executeQuery()) {
                while (rows.next()) {
                    servers.add(mapResultSetToServer(rows));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all servers for userId={}", userId, e);
        }
        return servers;
    }

    public List<Server> getAllServersGlobal() {
        logger.debug("Fetching all servers globally");
        List<Server> servers = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_ALL_SERVERS_GLOBAL);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                servers.add(mapResultSetToServer(rs));
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all servers globally", e);
        }
        return servers;
    }

    public boolean updateServer(Integer serverId, Long userId, String serverName, String serverUrl, Integer monitorIntervalMinutes) {
        logger.info("Updating server ID {} for userId={}: {} - {}", serverId, userId, serverName, serverUrl);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_SERVER)) {

            ps.setString(1, serverName);
            ps.setString(2, serverUrl);
            ps.setInt(3, normalizeMonitorInterval(monitorIntervalMinutes));
            ps.setInt(4, serverId);
            ps.setLong(5, userId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Server updated successfully: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to update server: {}", serverId, e);
        }
        return false;
    }

    public boolean deleteServer(Integer serverId, Long userId) {
        logger.info("Deleting server ID={} for userId={}", serverId, userId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DELETE_SERVER)) {

            ps.setInt(1, serverId);
            ps.setLong(2, userId);

            int affectedRows = ps.executeUpdate();

            if (affectedRows > 0) {
                logger.info("Server deleted successfully: {}", serverId);
                return true;
            }
        } catch (SQLException e) {
            logger.error("Failed to delete server: {}", serverId, e);
        }
        return false;
    }

    public boolean serverExists(String serverUrl, Long userId) {
        return getServerByUrl(serverUrl, userId) != null;
    }

    private Server mapResultSetToServer(ResultSet rs) throws SQLException {
        return new Server(
                rs.getInt("server_id"),
                rs.getLong("user_id"),
                rs.getString("server_name"),
                rs.getString("server_url"),
                rs.getInt("monitor_interval_minutes"),
                rs.getTimestamp("created_at")
        );
    }

    private int normalizeMonitorInterval(Integer monitorIntervalMinutes) {
        if (monitorIntervalMinutes == null) {
            return 30;
        }
        return Math.max(1, Math.min(1440, monitorIntervalMinutes));
    }
}
