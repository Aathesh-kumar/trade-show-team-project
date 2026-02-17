package com.tradeshow.pulse24x7.mcp.filter;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@WebFilter("/*")
public class CORSFilter extends HttpFilter {
    private static final Logger logger = LogManager.getLogger(CORSFilter.class);
    private Set<String> allowedOrigins;
    private boolean allowAllOrigins;
    
    @Override
    protected void doFilter(HttpServletRequest req, HttpServletResponse res, FilterChain chain) 
            throws IOException, ServletException {
        String origin = req.getHeader("Origin");
        if (isOriginAllowed(origin)) {
            String allowedOrigin = allowAllOrigins
                    ? (origin == null || origin.isBlank() ? "*" : origin)
                    : origin;
            res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
            res.setHeader("Vary", "Origin");
        }

        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.setHeader("Access-Control-Max-Age", "3600");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        chain.doFilter(req, res);
    }
    
    @Override
    public void init(FilterConfig config) throws ServletException {
        super.init(config);
        String origins = System.getenv("MCP_ALLOWED_ORIGINS");
        if (origins == null || origins.isBlank()) {
            origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080";
        }
        allowAllOrigins = "*".equals(origins.trim());
        allowedOrigins = allowAllOrigins
                ? new HashSet<>()
                : Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
        logger.info("CORSFilter initialized");
    }

    private boolean isOriginAllowed(String origin) {
        if (origin == null || origin.isBlank()) {
            return true;
        }
        return allowAllOrigins || allowedOrigins.contains(origin);
    }
}
