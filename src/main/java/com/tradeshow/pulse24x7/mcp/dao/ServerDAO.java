package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.Query;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.Server;

import java.sql.*;

public class ServerDAO {

    public Integer insertServer(String serverName, String serverURL){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.INSERT_SERVER, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1,serverName);
            ps.setString(2,serverURL);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if(rs.next()){
                return rs.getInt(1);
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public Server getServerByUrl(String serverURL){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.GET_SERVER_BY_URL);
            ps.setString(1,serverURL);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                int id = rs.getInt("server_id");
                String name = rs.getString("server_name");
                String url = rs.getString("server_url");
                String createdTime = rs.getString("created_at");
                return new Server(id,name,url,createdTime);
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
        return null;
    }
}
