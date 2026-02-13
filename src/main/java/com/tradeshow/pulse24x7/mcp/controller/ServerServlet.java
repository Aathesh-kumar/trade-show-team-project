package com.tradeshow.pulse24x7.mcp.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/serverServlet")
public class ServerServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        super.doGet(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        String serverName = req.getParameter("serverName");
        String serverURL = req.getParameter("serverURL");
        String headerType = req.getParameter("headerType");
        String apiKey = req.getParameter("apiKey");
        String accessToken = req.getParameter("accessTOken");
        String refreshToken = req.getParameter("refreshToken");

        if(serverName == null || serverURL == null || headerType == null || apiKey == null || accessToken == null || refreshToken == null){
            resp.getWriter().write("Invalid data please try again");
        }


    }
}
