package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public class JsonUtil {
    private static final Logger logger = LogManager.getLogger(JsonUtil.class);
    private static final Gson gson = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd HH:mm:ss")
            .setPrettyPrinting()
            .create();

    public static String toJson(Object object) {
        try {
            return gson.toJson(object);
        } catch (Exception e) {
            logger.error("Failed to convert object to JSON", e);
            return "{}";
        }
    }

    public static JsonObject createSuccessResponse(Object data) {
        JsonObject response = new JsonObject();
        response.addProperty("status", "success");
        response.add("data", gson.toJsonTree(data));
        return response;
    }

    public static JsonObject createErrorResponse(String message) {
        JsonObject response = new JsonObject();
        response.addProperty("status", "error");
        response.addProperty("message", message);
        return response;
    }

    public static JsonObject createMCPRequest(String method, Object params) {
        JsonObject request = new JsonObject();
        request.addProperty("jsonrpc", "2.0");
        request.addProperty("id", 1);
        request.addProperty("method", method);
        request.add("params", gson.toJsonTree(params));
        return request;
    }

    public static JsonObject parseObject(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return new JsonObject();
        }
        try {
            JsonElement element = JsonParser.parseString(rawJson);
            if (element.isJsonObject()) {
                return element.getAsJsonObject();
            }
        } catch (Exception e) {
            logger.error("Failed to parse JSON object", e);
        }
        return new JsonObject();
    }

    public static Gson getGson() {
        return gson;
    }
}
