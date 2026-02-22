package com.tradeshow.pulse24x7.mcp.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.tradeshow.pulse24x7.mcp.dao.ToolDAO;
import com.tradeshow.pulse24x7.mcp.dao.ToolHistoryDAO;
import com.tradeshow.pulse24x7.mcp.model.Server;
import com.tradeshow.pulse24x7.mcp.model.Tool;
import com.tradeshow.pulse24x7.mcp.model.ToolHistory;
import com.tradeshow.pulse24x7.mcp.utils.AuthHeaderUtil;
import com.tradeshow.pulse24x7.mcp.utils.HttpClientUtil;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import org.apache.hc.core5.http.ContentType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class ToolService {
    private static final Logger logger = LogManager.getLogger(ToolService.class);
    private final ToolDAO toolDAO;
    private final ToolHistoryDAO toolHistoryDAO;
    private final AuthTokenService authTokenService;
    private final RequestLogService requestLogService;
    private final NotificationService notificationService;
    private final ServerService serverService;

    public ToolService() {
        this.toolDAO = new ToolDAO();
        this.toolHistoryDAO = new ToolHistoryDAO();
        this.authTokenService = new AuthTokenService();
        this.requestLogService = new RequestLogService();
        this.notificationService = new NotificationService();
        this.serverService = new ServerService();
    }

    public List<Tool> fetchAndUpdateTools(Integer serverId, String serverUrl, String accessToken, String headerType) {
        logger.info("Fetching tools from server ID: {}", serverId);

        try {
            Map<String, Object> params = new HashMap<>();
            JsonObject request = JsonUtil.createMCPRequest("tools/list", params);

            JsonObject response = doPostWithRefresh(serverId, serverUrl, headerType, accessToken, request, true);

            List<Tool> oldTools = getToolsByServer(serverId);
            Set<String> previousActiveTools = oldTools.stream()
                    .filter(tool -> Boolean.TRUE.equals(tool.getIsAvailability()))
                    .map(Tool::getToolName)
                    .filter(name -> name != null && !name.isBlank())
                    .collect(Collectors.toSet());
            List<Tool> newTools = parseToolsFromResponse(response, serverId);
            Set<String> currentTools = newTools.stream()
                    .map(Tool::getToolName)
                    .filter(name -> name != null && !name.isBlank())
                    .collect(Collectors.toSet());
            List<Tool> changedOrAddedTools = getChangedOrAddedTools(oldTools, newTools);
            if (!changedOrAddedTools.isEmpty()) {
                updateToolsInDatabase(serverId, changedOrAddedTools);
            }
            if (newTools.isEmpty()) {
                toolDAO.disableAllToolsByServer(serverId);
            } else {
                toolDAO.disableMissingTools(serverId, newTools);
            }
            notifyToolChanges(serverId, previousActiveTools, currentTools);
            return newTools;
        } catch (Exception e) {
            logger.error("Failed to fetch tools from server ID: {}", serverId, e);
            return List.of();
        }
    }

    public JsonObject executeTool(Integer serverId, String serverUrl, String headerType, String accessToken,
                                  String toolName, JsonObject inputParams) {
        Map<String, Object> params = new HashMap<>();
        params.put("name", toolName);
        params.put("arguments", inputParams == null ? new JsonObject() : inputParams);

        JsonObject request = JsonUtil.createMCPRequest("tools/call", params);
        return doPostWithRefresh(serverId, serverUrl, headerType, accessToken, request, false);
    }

    private JsonObject doPostWithRefresh(Integer serverId, String serverUrl, String headerType,
                                         String accessToken, JsonObject request, boolean recordInRequestLogs) {
        long start = System.currentTimeMillis();
        JsonObject requestPayload = request == null ? new JsonObject() : request.deepCopy();
        requestPayload.addProperty("mcpServerUrl", serverUrl);
        String mcpMethod = resolveMcpMethod(requestPayload);
        try {
            JsonObject response = HttpClientUtil.doPost(serverUrl, buildHeaders(accessToken, headerType), request.toString());
            if (recordInRequestLogs) {
                recordMcpRequestLog(serverId, mcpMethod, start, requestPayload, response, null, 200);
            }
            return response;
        } catch (RuntimeException ex) {
            if (!shouldRefreshToken(serverId, ex)) {
                if (recordInRequestLogs) {
                    recordMcpRequestLog(serverId, mcpMethod, start, requestPayload, wrapError(ex), ex.getMessage(), resolveStatusCode(ex));
                }
                throw ex;
            }
            String refreshed = authTokenService.refreshAccessToken(serverId);
            try {
                JsonObject response = HttpClientUtil.doPost(serverUrl, buildHeaders(refreshed, headerType), request.toString());
                if (recordInRequestLogs) {
                    recordMcpRequestLog(serverId, mcpMethod, start, requestPayload, response, null, 200);
                }
                return response;
            } catch (RuntimeException retryEx) {
                if (recordInRequestLogs) {
                    recordMcpRequestLog(serverId, mcpMethod, start, requestPayload, wrapError(retryEx), retryEx.getMessage(), resolveStatusCode(retryEx));
                }
                throw retryEx;
            }
        }
    }

    private void recordMcpRequestLog(Integer serverId, String mcpMethod, long startMillis,
                                     JsonObject requestPayload, JsonObject responseBody, String errorMessage, int statusCode) {
        long latency = Math.max(0L, System.currentTimeMillis() - startMillis);
        requestLogService.record(
                requestLogService.buildRequestLog(
                        serverId,
                        null,
                        mcpMethod,
                        "POST",
                        statusCode,
                        statusCode >= 200 && statusCode < 300 ? "OK" : "ERR",
                        latency,
                        requestPayload,
                        responseBody == null ? new JsonObject() : responseBody,
                        errorMessage,
                        "Pulse24x7-Backend"
                )
        );
    }

    private int resolveStatusCode(RuntimeException ex) {
        if (ex instanceof HttpClientUtil.HttpRequestException httpEx) {
            int code = httpEx.getStatusCode();
            return code > 0 ? code : 502;
        }
        return 502;
    }

    private String resolveMcpMethod(JsonObject requestPayload) {
        if (requestPayload != null && requestPayload.has("method") && !requestPayload.get("method").isJsonNull()) {
            try {
                return requestPayload.get("method").getAsString();
            } catch (Exception ignored) {
                // ignore and fallback
            }
        }
        return "__MCP_CALL__";
    }

    private JsonObject wrapError(RuntimeException ex) {
        JsonObject error = new JsonObject();
        if (ex instanceof HttpClientUtil.HttpRequestException httpEx) {
            error.addProperty("statusCode", httpEx.getStatusCode());
            error.addProperty("responseBody", httpEx.getResponseBody());
        }
        error.addProperty("error", ex.getMessage() == null ? "MCP request failed" : ex.getMessage());
        return error;
    }

    private boolean shouldRefreshToken(Integer serverId, RuntimeException ex) {
        if (ex instanceof HttpClientUtil.HttpRequestException httpEx) {
            int statusCode = httpEx.getStatusCode();
            if (statusCode == 403) {
                return false;
            }
            if (statusCode == 401) {
                if (authTokenService.isTokenExpired(serverId, 0)) {
                    return true;
                }
                String body = httpEx.getResponseBody();
                String lowerBody = body == null ? "" : body.toLowerCase();
                return lowerBody.contains("invalid_oauthtoken")
                        || lowerBody.contains("invalid oauth token")
                        || lowerBody.contains("expired");
            }
        }
        String message = ex.getMessage();
        if (message == null) {
            return false;
        }
        String lower = message.toLowerCase();
        return authTokenService.isTokenExpired(serverId, 0) && (
                lower.contains("401")
                || lower.contains("expired")
                || lower.contains("invalid_oauthtoken")
                || lower.contains("invalid oauth token")
                || lower.contains("unauthorized")
        );
    }

    private Map<String, String> buildHeaders(String accessToken, String headerType) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", String.valueOf(ContentType.APPLICATION_JSON));
        return AuthHeaderUtil.withAuthHeaders(headers, headerType, accessToken);
    }

    private List<Tool> parseToolsFromResponse(JsonObject response, Integer serverId) {
        List<Tool> tools = new ArrayList<>();

        try {
            JsonArray toolsArray = null;
            if (response.has("result") && response.get("result").isJsonObject()) {
                JsonObject result = response.getAsJsonObject("result");
                if (result.has("tools") && result.get("tools").isJsonArray()) {
                    toolsArray = result.getAsJsonArray("tools");
                }
            }

            if (toolsArray == null && response.has("tools") && response.get("tools").isJsonArray()) {
                toolsArray = response.getAsJsonArray("tools");
            }

            if (toolsArray == null) {
                logger.warn("No tools found in MCP response");
                return tools;
            }

            for (JsonElement toolElement : toolsArray) {
                if (!toolElement.isJsonObject()) {
                    continue;
                }
                JsonObject toolObj = toolElement.getAsJsonObject();
                String name = getString(toolObj, "name");
                if (name == null || name.isBlank()) {
                    continue;
                }

                Tool tool = new Tool();
                tool.setToolName(name);
                tool.setToolDescription(getString(toolObj, "description"));
                tool.setToolType(resolveToolType(toolObj));
                tool.setInputSchema(resolveJsonString(toolObj, "inputSchema", "input_schema", "parameters"));
                tool.setOutputSchema(resolveJsonString(toolObj, "outputSchema", "output_schema"));
                tool.setServerId(serverId);
                tool.setIsAvailability(true);
                tools.add(tool);
            }

            logger.info("Parsed {} tools from response", tools.size());
        } catch (Exception e) {
            logger.error("Failed to parse tools from response", e);
        }

        return tools;
    }

    private String resolveToolType(JsonObject toolObj) {
        String declared = getString(toolObj, "type");
        if (declared != null && !declared.isBlank()) {
            return declared.toUpperCase();
        }
        return "ACTION";
    }

    private String resolveJsonString(JsonObject source, String... keys) {
        for (String key : keys) {
            if (source.has(key) && !source.get(key).isJsonNull()) {
                return source.get(key).toString();
            }
        }
        return null;
    }

    private List<Tool> getChangedOrAddedTools(List<Tool> oldTools, List<Tool> newTools) {
        Map<String, Tool> oldByName = new LinkedHashMap<>();
        for (Tool oldTool : oldTools) {
            if (oldTool.getToolName() != null) {
                oldByName.put(oldTool.getToolName(), oldTool);
            }
        }
        List<Tool> changed = new ArrayList<>();
        for (Tool newTool : newTools) {
            Tool oldTool = oldByName.get(newTool.getToolName());
            if (oldTool == null || isToolDifferent(oldTool, newTool)) {
                changed.add(newTool);
            }
        }
        return changed;
    }

    private boolean isToolDifferent(Tool oldTool, Tool newTool) {
        return !safeEquals(oldTool.getToolDescription(), newTool.getToolDescription())
                || !safeEquals(oldTool.getToolType(), newTool.getToolType())
                || !safeEquals(normalizeJson(oldTool.getInputSchema()), normalizeJson(newTool.getInputSchema()))
                || !safeEquals(normalizeJson(oldTool.getOutputSchema()), normalizeJson(newTool.getOutputSchema()))
                || !Boolean.TRUE.equals(oldTool.getIsAvailability());
    }

    private String normalizeJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        try {
            return JsonParser.parseString(raw).toString();
        } catch (Exception e) {
            return raw.trim();
        }
    }

    private boolean safeEquals(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }

    private String getString(JsonObject source, String key) {
        if (!source.has(key) || source.get(key).isJsonNull()) {
            return null;
        }
        try {
            return source.get(key).getAsString();
        } catch (Exception ignored) {
            return null;
        }
    }

    private void updateToolsInDatabase(Integer serverId, List<Tool> tools) {
        logger.info("Updating {} tools for server ID: {}", tools.size(), serverId);

        for (Tool tool : tools) {
            toolDAO.insertTool(
                    tool.getToolName(),
                    tool.getToolDescription(),
                    tool.getToolType(),
                    tool.getInputSchema(),
                    tool.getOutputSchema(),
                    serverId
            );
        }
    }

    public List<Tool> getToolsByServer(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return List.of();
        }
        return toolDAO.getToolsByServer(serverId);
    }

    public List<Tool> getAvailableTools(Integer serverId) {
        if (serverId == null || serverId <= 0) {
            logger.error("Invalid server ID: {}", serverId);
            return List.of();
        }
        return toolDAO.getAvailableTools(serverId);
    }

    public List<Tool> getToolsByServerSnapshot(Integer serverId, Timestamp snapshotAt) {
        if (serverId == null || serverId <= 0 || snapshotAt == null) {
            logger.error("Invalid parameters for tool snapshot: serverId={}, snapshotAt={}", serverId, snapshotAt);
            return List.of();
        }
        return toolDAO.getToolsByServerSnapshot(serverId, snapshotAt);
    }

    public Tool getToolById(Integer toolId) {
        if (toolId == null || toolId <= 0) {
            logger.error("Invalid tool ID: {}", toolId);
            return null;
        }
        return toolDAO.getToolById(toolId);
    }

    public List<ToolHistory> getToolHistory(Integer toolId, int limit) {
        if (toolId == null || toolId <= 0) {
            logger.error("Invalid tool ID: {}", toolId);
            return List.of();
        }
        return toolHistoryDAO.getToolHistory(toolId, limit);
    }

    public List<ToolHistory> getToolHistoryLastHours(Integer toolId, int hours) {
        if (toolId == null || toolId <= 0 || hours <= 0) {
            logger.error("Invalid parameters: toolId={}, hours={}", toolId, hours);
            return List.of();
        }
        return toolHistoryDAO.getToolHistoryLastHours(toolId, hours);
    }

    public List<ToolHistory> getToolHistoryRange(Integer toolId, Timestamp startTime,
                                                  Timestamp endTime) {
        if (toolId == null || toolId <= 0 || startTime == null || endTime == null) {
            logger.error("Invalid parameters for history range query");
            return List.of();
        }
        return toolHistoryDAO.getToolHistoryRange(toolId, startTime, endTime);
    }

    public Double getToolAvailabilityPercent(Integer toolId) {
        if (toolId == null || toolId <= 0) {
            return 0.0;
        }
        return toolHistoryDAO.getToolAvailabilityPercent(toolId);
    }

    public boolean hasHistorySince(Integer toolId, Timestamp since) {
        if (toolId == null || toolId <= 0 || since == null) {
            return false;
        }
        return toolHistoryDAO.existsSince(toolId, since);
    }

    public boolean hasAvailableHistorySince(Integer toolId, Timestamp since) {
        if (toolId == null || toolId <= 0 || since == null) {
            return false;
        }
        return toolHistoryDAO.existsAvailableSince(toolId, since);
    }

    public boolean recordToolHistory(Integer toolId, Boolean isAvailable) {
        if (toolId == null || toolId <= 0 || isAvailable == null) {
            logger.error("Invalid parameters for recording tool history");
            return false;
        }
        return toolHistoryDAO.insertHistory(toolId, isAvailable);
    }

    public boolean trackToolRequest(Integer toolId, int statusCode, long latencyMs) {
        boolean success = statusCode >= 200 && statusCode < 300;
        return toolDAO.updateToolRequestMetrics(toolId, success, statusCode, latencyMs);
    }

    public JsonObject parseJsonObjectSafely(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new JsonObject();
        }
        try {
            return JsonParser.parseString(rawJson).getAsJsonObject();
        } catch (Exception e) {
            return new JsonObject();
        }
    }

    public boolean isScopeRelatedError(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }
        String lower = message.toLowerCase();
        return lower.contains("insufficient scope")
                || lower.contains("invalid scope")
                || lower.contains("mismatch scope")
                || lower.contains("scope mismatch")
                || lower.contains("scope_invalid")
                || lower.contains("oauthtoken_scope_invalid")
                || lower.contains("scope");
    }

    public boolean hasScopeErrorPayload(JsonObject responseData) {
        if (responseData == null) {
            return false;
        }
        String payload = responseData.toString().toLowerCase();
        return payload.contains("oauthtoken_scope_invalid")
                || payload.contains("invalid_scope")
                || payload.contains("insufficient scope")
                || payload.contains("scope_invalid");
    }

    public String extractMcpErrorMessage(JsonObject responseData) {
        if (responseData == null) {
            return null;
        }

        if (responseData.has("error") && !responseData.get("error").isJsonNull()) {
            String errorMessage = extractMessageFromErrorElement(responseData.get("error"));
            if (errorMessage != null && !errorMessage.isBlank()) {
                return errorMessage;
            }
            return "MCP request failed";
        }

        if (responseData.has("result") && responseData.get("result").isJsonObject()) {
            JsonObject result = responseData.getAsJsonObject("result");
            if (result.has("isError") && result.get("isError").getAsBoolean()) {
                String message = extractMessageFromResult(result);
                if (message != null && !message.isBlank()) {
                    return message;
                }
                return "MCP tool execution reported an error";
            }
        }

        return null;
    }

    private String extractMessageFromErrorElement(JsonElement errorElement) {
        if (errorElement == null || errorElement.isJsonNull()) {
            return null;
        }
        if (errorElement.isJsonPrimitive()) {
            try {
                return errorElement.getAsString();
            } catch (Exception ignored) {
                return null;
            }
        }
        if (errorElement.isJsonObject()) {
            JsonObject errorObj = errorElement.getAsJsonObject();
            String code = getString(errorObj, "code");
            String message = getString(errorObj, "message");
            if (message != null && !message.isBlank()) {
                return code == null || code.isBlank() ? message : code + ": " + message;
            }
            return errorObj.toString();
        }
        return errorElement.toString();
    }

    private String extractMessageFromResult(JsonObject result) {
        String directMessage = getString(result, "message");
        if (directMessage != null && !directMessage.isBlank()) {
            return directMessage;
        }

        if (result.has("content") && result.get("content").isJsonArray()) {
            JsonArray content = result.getAsJsonArray("content");
            for (JsonElement item : content) {
                if (!item.isJsonObject()) {
                    continue;
                }
                JsonObject contentObj = item.getAsJsonObject();
                String text = getString(contentObj, "text");
                if (text == null || text.isBlank()) {
                    continue;
                }
                String extracted = extractMessageFromText(text);
                if (extracted != null && !extracted.isBlank()) {
                    return extracted;
                }
                return text;
            }
        }

        return null;
    }

    private String extractMessageFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            JsonObject nested = JsonParser.parseString(text.trim()).getAsJsonObject();
            String code = getString(nested, "code");
            String message = getString(nested, "message");
            if (message != null && !message.isBlank()) {
                return code == null || code.isBlank() ? message : code + ": " + message;
            }
        } catch (Exception ignored) {
            // text content is plain string, return as-is at caller
        }
        return null;
    }

    private void notifyToolChanges(Integer serverId, Set<String> previousActiveTools, Set<String> currentTools) {
        if (serverId == null) {
            return;
        }
        Set<String> addedTools = currentTools.stream()
                .filter(name -> !previousActiveTools.contains(name))
                .collect(Collectors.toSet());
        Set<String> removedTools = previousActiveTools.stream()
                .filter(name -> !currentTools.contains(name))
                .collect(Collectors.toSet());

        if (addedTools.isEmpty() && removedTools.isEmpty()) {
            return;
        }

        Server server = serverService.getServerByIdGlobal(serverId);
        String serverName = server != null && server.getServerName() != null && !server.getServerName().isBlank()
                ? server.getServerName()
                : "Server " + serverId;

        if (!addedTools.isEmpty()) {
            notificationService.notify(
                    serverId,
                    "tools",
                    "info",
                    "Tools added",
                    "New tools on " + serverName + ": " + String.join(", ", addedTools)
            );
        }
        if (!removedTools.isEmpty()) {
            notificationService.notify(
                    serverId,
                    "tools",
                    "warning",
                    "Tools removed",
                    "Removed tools on " + serverName + ": " + String.join(", ", removedTools)
            );
        }
    }
}
