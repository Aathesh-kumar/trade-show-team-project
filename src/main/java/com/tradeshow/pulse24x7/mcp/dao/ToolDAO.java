package com.tradeshow.pulse24x7.mcp.dao;

import com.tradeshow.pulse24x7.mcp.Query;
import com.tradeshow.pulse24x7.mcp.db.DBConnection;
import com.tradeshow.pulse24x7.mcp.model.Tool;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ToolDAO {

    public void insertTool(String toolName,String description,int serverId){
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.INSERT_TOOL);
            ps.setString(1,toolName);
            ps.setString(2,description);
            ps.setInt(3,serverId);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public void disableMissingTools(int server_id, List<Tool> activeTools){
        if(activeTools.isEmpty()){
            return;
        }

        String placeholders = String.join(",", Collections.nCopies(activeTools.size(), "?"));

        String disable_tools = "UPDATE tools SET is_availability = FALSE, last_modify = CURRENT_TIMESTAMP WHERE server_id = ? AND tool_name NOT IN (" + placeholders + ");";

        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(disable_tools);
            ps.setInt(1,server_id);
            int index=2;
            for (int i = 0; i < activeTools.size(); i++) {
                ps.setString(index,activeTools.get(i).getToolName());
                index++;
            }
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }

    public List<Tool> getActiveTools(int serverId){
        List<Tool> tools = new ArrayList<>();
        try(Connection con = DBConnection.getInstance().getConnection()){
            PreparedStatement ps = con.prepareStatement(Query.AVAILABLE_TOOLS);
            ps.setInt(1,serverId);
            ResultSet rs = ps.executeQuery();

            while(rs.next()){
                String name = rs.getString("tool_name");
                String description = rs.getString("tool_description");
                boolean availability = rs.getBoolean("is_availability");
                String createdTime = rs.getString("create_at");
                String lastModify = rs.getString("last_modify");
                boolean add = tools.add(new Tool(name,description,availability,createdTime,lastModify));
            }
            return tools;
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }



}
