package com.tradeshow.pulse24x7.mcp.service;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.dao.RequestLogDAO;
import com.tradeshow.pulse24x7.mcp.model.RequestLog;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RequestLogService {
    private static final DateTimeFormatter GENERATED_AT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final RequestLogDAO requestLogDAO;

    public RequestLogService() {
        this.requestLogDAO = new RequestLogDAO();
    }

    public void record(RequestLog requestLog) {
        requestLogDAO.insert(requestLog);
    }

    public List<RequestLog> getLogs(Integer serverId, String search, String status, String tool,
                                    int hours, int limit, int offset) {
        Integer statusMin = null;
        Integer statusMax = null;

        if ("success".equalsIgnoreCase(status)) {
            statusMin = 200;
            statusMax = 299;
        } else if ("warning".equalsIgnoreCase(status)) {
            statusMin = 400;
            statusMax = 499;
        } else if ("error".equalsIgnoreCase(status)) {
            statusMin = 500;
            statusMax = 599;
        }

        return requestLogDAO.getLogs(serverId, search, statusMin, statusMax, tool, hours, limit, offset);
    }

    public long countLogs(Integer serverId, String search, String status, String tool, int hours) {
        Integer statusMin = null;
        Integer statusMax = null;
        if ("success".equalsIgnoreCase(status)) {
            statusMin = 200;
            statusMax = 299;
        } else if ("warning".equalsIgnoreCase(status)) {
            statusMin = 400;
            statusMax = 499;
        } else if ("error".equalsIgnoreCase(status)) {
            statusMin = 500;
            statusMax = 599;
        }
        return requestLogDAO.countLogs(serverId, search, statusMin, statusMax, tool, hours);
    }

    public Map<String, Object> getStats(Integer serverId) {
        return requestLogDAO.getStats(serverId);
    }

    public Map<String, Object> getDashboardMetrics(Integer serverId, int activeServerCount, Double uptimePercent,
                                                   int hours, int bucketMinutes, int bucketSeconds) {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> requestStats = requestLogDAO.getStats(serverId);
        response.put("requestStats", requestStats);
        response.put("throughput24h", requestLogDAO.getThroughput(serverId, hours, bucketMinutes, bucketSeconds));
        response.put("topTools", requestLogDAO.getTopTools(serverId, 5));
        response.put("activeServerCount", activeServerCount);
        response.put("uptimePercent", uptimePercent == null ? 0.0 : uptimePercent);
        response.put("generatedAt", LocalDateTime.now().format(GENERATED_AT_FORMAT));
        return response;
    }

    public RequestLog buildRequestLog(Integer serverId, Integer toolId, String toolName, String method,
                                      int statusCode, String statusText, long latencyMs,
                                      JsonObject requestPayload, JsonObject responseBody,
                                      String errorMessage, String userAgent) {
        RequestLog requestLog = new RequestLog();
        requestLog.setServerId(serverId);
        requestLog.setToolId(toolId);
        requestLog.setToolName(toolName);
        requestLog.setMethod(method);
        requestLog.setStatusCode(statusCode);
        requestLog.setStatusText(statusText);
        requestLog.setLatencyMs(latencyMs);
        requestLog.setRequestPayload(requestPayload == null ? "{}" : requestPayload.toString());
        requestLog.setResponseBody(responseBody == null ? "{}" : responseBody.toString());
        requestLog.setErrorMessage(errorMessage);
        requestLog.setResponseSizeBytes(responseBody == null ? 0L : (long) responseBody.toString().length());
        requestLog.setUserAgent(userAgent);
        return requestLog;
    }
}
