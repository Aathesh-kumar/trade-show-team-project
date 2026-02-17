package com.tradeshow.pulse24x7.mcp.filter;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@WebFilter("/*")
public class JwtAuthFilter extends HttpFilter {
    @Override
    protected void doFilter(HttpServletRequest req, HttpServletResponse resp, FilterChain chain) throws IOException, ServletException {
        if (!isAuthEnabled()) {
            chain.doFilter(req, resp);
            return;
        }
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(req, resp);
            return;
        }

        String path = req.getRequestURI();
        String context = req.getContextPath();
        String relative = path.startsWith(context) ? path.substring(context.length()) : path;
        if (!isApiPath(relative)) {
            chain.doFilter(req, resp);
            return;
        }
        if (relative.startsWith("/user-auth/signup") || relative.startsWith("/user-auth/login")) {
            chain.doFilter(req, resp);
            return;
        }

        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendUnauthorized(resp, "Missing bearer token");
            return;
        }
        String token = authHeader.substring("Bearer ".length()).trim();
        JsonObject payload = JwtUtil.verify(token);
        if (payload == null || !payload.has("sub")) {
            sendUnauthorized(resp, "Invalid or expired token");
            return;
        }
        req.setAttribute("userId", payload.get("sub").getAsLong());
        req.setAttribute("userEmail", payload.has("email") ? payload.get("email").getAsString() : null);
        chain.doFilter(req, resp);
    }

    private boolean isAuthEnabled() {
        String value = System.getenv("MCP_AUTH_ENABLED");
        if (value == null || value.isBlank()) {
            return true;
        }
        return Boolean.parseBoolean(value);
    }

    private void sendUnauthorized(HttpServletResponse resp, String message) throws IOException {
        resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        resp.setContentType("application/json");
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
        resp.getWriter().write(JsonUtil.createErrorResponse(message).toString());
    }

    private boolean isApiPath(String relative) {
        return relative.startsWith("/server")
                || relative.startsWith("/tool")
                || relative.startsWith("/auth")
                || relative.startsWith("/metrics")
                || relative.startsWith("/request-log")
                || relative.startsWith("/notification")
                || relative.startsWith("/dashboard")
                || relative.startsWith("/history")
                || relative.startsWith("/user-auth");
    }
}
