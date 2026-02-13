package com.tradeshow.pulse24x7.mcp.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.tradeshow.pulse24x7.mcp.model.Tool;

import java.io.IOException;
import java.util.List;

@WebServlet("/toolServlet")
public class ToolServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String serverIdParam = req.getParameter("servlet_id");
        int server_id;
        if(serverIdParam != null){
            server_id = Integer.parseInt(serverIdParam);
        }

        List<Tool> activeTools = null;
        resp.setContentType("application/json");
        resp.getWriter().write(activeTools.toString());
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    }
}