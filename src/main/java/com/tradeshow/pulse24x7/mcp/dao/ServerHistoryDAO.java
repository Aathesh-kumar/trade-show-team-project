package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.Query;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class ServerHistoryDAO {

    public void insertHistory(int serverId, boolean status, int toolCount){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.INSERT_SERVER_HISTORY);
            ps.setInt(1,serverId);
            ps.setBoolean(2,status);
            ps.setInt(3,toolCount);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public Boolean getLastServerStatus(int serverId){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.LAST_SERVER_STATUS);
            ps.setInt(1,serverId);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                return rs.getBoolean("server_up");
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public Integer getLastToolCount(int serverId){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.LAST_TOOL_COUNT);
            ps.setInt(1,serverId);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                return rs.getInt("tool_count");
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public int getTotalChecks(int serverId){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.TOTAL_CHECK);
            ps.setInt(1, serverId);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                return rs.getInt("total_checks");
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
        return 0;
    }

    public int getUptimePercent(int serverId){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.UPTIME_PERCENT);
            ps.setInt(1,serverId);
            ResultSet rs = ps.executeQuery();
            if(rs.next()){
                return rs.getInt("uptime_percent");
            }
        } catch (SQLException e){
            throw new RuntimeException(e);
        }
        return 0;
    }


}
