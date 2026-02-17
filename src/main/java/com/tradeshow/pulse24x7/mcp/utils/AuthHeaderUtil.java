package com.tradeshow.pulse24x7.mcp.utils;

import java.util.HashMap;
import java.util.Map;

public final class AuthHeaderUtil {
    private AuthHeaderUtil() {
    }

    public static Map<String, String> withAuthHeaders(Map<String, String> base, String headerType, String accessToken) {
        Map<String, String> headers = new HashMap<>();
        if (base != null) {
            headers.putAll(base);
        }
        if (accessToken == null || accessToken.isBlank()) {
            return headers;
        }

        String type = (headerType == null || headerType.isBlank()) ? "Bearer" : headerType.trim();
        if ("Authorization".equalsIgnoreCase(type)) {
            headers.put("Authorization", accessToken);
            return headers;
        }

        // Common form: Authorization: Bearer|Zoho-oauthtoken <token>
        headers.put("Authorization", type + " " + accessToken);

        // Also support custom header style (for endpoints expecting direct token header).
        if (looksLikeHeaderName(type)) {
            headers.put(type, accessToken);
        }
        return headers;
    }

    private static boolean looksLikeHeaderName(String value) {
        String normalized = value.toLowerCase();
        return value.contains("-")
                || normalized.startsWith("x-")
                || normalized.contains("api")
                || normalized.contains("token");
    }
}
