package com.tradeshow.pulse24x7.mcp.dao;


import com.tradeshow.pulse24x7.mcp.db.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ToolHistoryDAO {
    public void insertHistory(int toolId,boolean available){
        try(Connection con = DBConnection.getInstance().getConnection()){
//            PreparedStatement ps = con.prepareStatement();
        } catch(SQLException e){
            throw new RuntimeException(e);
        }
    }
}
