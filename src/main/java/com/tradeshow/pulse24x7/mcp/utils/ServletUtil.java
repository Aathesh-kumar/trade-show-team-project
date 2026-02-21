package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;

import java.io.BufferedReader;
import java.io.IOException;

public final class ServletUtil {

    private ServletUtil() {
    }

    public static String readBody(HttpServletRequest req) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = req.getReader()) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
        }
        return sb.toString();
    }

    public static JsonObject readJsonBody(HttpServletRequest req) throws IOException {
        return JsonUtil.parseObject(readBody(req));
    }

    public static String getString(JsonObject json, String key, String defaultValue) {
        if (json == null || !json.has(key) || json.get(key).isJsonNull()) {
            return defaultValue;
        }
        try {
            return json.get(key).getAsString();
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    public static Integer getInteger(JsonObject json, String key, Integer defaultValue) {
        if (json == null || !json.has(key) || json.get(key).isJsonNull()) {
            return defaultValue;
        }
        try {
            return json.get(key).getAsInt();
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    public static Double getDouble(JsonObject json, String key, Double defaultValue){
        if (json == null || !json.has(key) || json.get(key).isJsonNull()) {
            return defaultValue;
        }
        try {
            return json.get(key).getAsDouble();
        } catch (Exception ex) {
            return defaultValue;
        }
    }
}
