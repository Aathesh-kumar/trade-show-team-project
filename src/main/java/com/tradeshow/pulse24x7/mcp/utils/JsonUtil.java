package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;
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

    public static <T> T fromJson(String json, Class<T> classOfT) {
        try {
            return gson.fromJson(json, classOfT);
        } catch (JsonSyntaxException e) {
            logger.error("Failed to parse JSON string", e);
            return null;
        }
    }

    public static JsonObject createSuccessResponse(Object data) {
        JsonObject response = new JsonObject();
        response.addProperty("status", Constants.SUCCESS);
        response.add("data", gson.toJsonTree(data));
        return response;
    }

    public static JsonObject createErrorResponse(String message) {
        JsonObject response = new JsonObject();
        response.addProperty("status", Constants.ERROR);
        response.addProperty("message", message);
        return response;
    }

    public static JsonObject createMCPRequest(String method, Object params) {
        JsonObject request = new JsonObject();
        request.addProperty("jsonrpc", Constants.JSONRPC_VERSION);
        request.addProperty("id", 1);
        request.addProperty("method", method);
        request.add("params", gson.toJsonTree(params));
        return request;
    }

    public static Gson getGson() {
        return gson;
    }
}