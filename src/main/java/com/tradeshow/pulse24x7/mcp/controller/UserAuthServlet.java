package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.service.UserAuthService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.JwtUtil;
import com.tradeshow.pulse24x7.mcp.utils.ServletUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/user-auth/*")
public class UserAuthServlet extends HttpServlet {
    private UserAuthService userAuthService;

    @Override
    public void init() throws ServletException {
        super.init();
        userAuthService = new UserAuthService();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/signup".equals(pathInfo)) {
            handleSignup(req, resp);
            return;
        }
        if ("/login".equals(pathInfo)) {
            handleLogin(req, resp);
            return;
        }
        sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if (!"/me".equals(pathInfo)) {
            sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        User user = userAuthService.findById((Long) uid);
        if (user == null) {
            sendErrorResponse(resp, "User not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, toSafeUser(user));
    }

    private void handleSignup(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String fullName = ServletUtil.getString(payload, "fullName", null);
        String email = ServletUtil.getString(payload, "email", null);
        String password = ServletUtil.getString(payload, "password", null);
        User user = userAuthService.signup(fullName, email, password);
        if (user == null) {
            sendErrorResponse(resp, "Signup failed. Email may already exist or input invalid.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        String token = JwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(user));
        sendSuccessResponse(resp, response);
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String email = ServletUtil.getString(payload, "email", null);
        String password = ServletUtil.getString(payload, "password", null);
        User user = userAuthService.login(email, password);
        if (user == null) {
            sendErrorResponse(resp, "Invalid email or password", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String token = JwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(user));
        sendSuccessResponse(resp, response);
    }

    private Map<String, Object> toSafeUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("fullName", user.getFullName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }

    private void initResponse(HttpServletResponse resp) {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode) throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}
