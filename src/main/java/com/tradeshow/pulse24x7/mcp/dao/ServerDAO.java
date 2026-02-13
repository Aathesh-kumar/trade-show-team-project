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

    public Integer insertServer(String serverName, String serverUrl) {
        logger.info("Inserting server: {} - {}", serverName, serverUrl);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.INSERT_SERVER, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, serverName);
            ps.setString(2, serverUrl);

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

    public Server getServerById(Integer serverId) {
        logger.debug("Fetching server by ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_BY_ID)) {

            ps.setInt(1, serverId);

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

    public Server getServerByUrl(String serverUrl) {
        logger.debug("Fetching server by URL: {}", serverUrl);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_SERVER_BY_URL)) {

            ps.setString(1, serverUrl);

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

    public List<Server> getAllServers() {
        logger.debug("Fetching all servers");
        List<Server> servers = new ArrayList<>();

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.GET_ALL_SERVERS);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                servers.add(mapResultSetToServer(rs));
            }

            logger.info("Fetched {} servers", servers.size());
        } catch (SQLException e) {
            logger.error("Failed to fetch all servers", e);
        }
        return servers;
    }

    public boolean updateServer(Integer serverId, String serverName, String serverUrl) {
        logger.info("Updating server ID {}: {} - {}", serverId, serverName, serverUrl);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.UPDATE_SERVER)) {

            ps.setString(1, serverName);
            ps.setString(2, serverUrl);
            ps.setInt(3, serverId);

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

    public boolean deleteServer(Integer serverId) {
        logger.info("Deleting server ID: {}", serverId);

        try (Connection con = DBConnection.getInstance().getConnection();
             PreparedStatement ps = con.prepareStatement(DBQueries.DELETE_SERVER)) {

            ps.setInt(1, serverId);

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

    public boolean serverExists(String serverUrl) {
        return getServerByUrl(serverUrl) != null;
    }

    private Server mapResultSetToServer(ResultSet rs) throws SQLException {
        return new Server(
                rs.getInt("server_id"),
                rs.getString("server_name"),
                rs.getString("server_url"),
                rs.getTimestamp("created_at")
        );
    }
}