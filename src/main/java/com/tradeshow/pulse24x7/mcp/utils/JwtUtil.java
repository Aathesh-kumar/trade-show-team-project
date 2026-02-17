package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public final class JwtUtil {
    private static final String DEFAULT_SECRET = "change-me-pulse24x7-jwt-secret";

    private JwtUtil() {
    }

    public static String generateToken(long userId, String email, String role, long expiresInSeconds) {
        long now = Instant.now().getEpochSecond();
        long exp = now + Math.max(60, expiresInSeconds);

        JsonObject header = new JsonObject();
        header.addProperty("alg", "HS256");
        header.addProperty("typ", "JWT");

        JsonObject payload = new JsonObject();
        payload.addProperty("sub", userId);
        payload.addProperty("email", email);
        payload.addProperty("role", role);
        payload.addProperty("iat", now);
        payload.addProperty("exp", exp);

        String headerEnc = b64Url(header.toString().getBytes(StandardCharsets.UTF_8));
        String payloadEnc = b64Url(payload.toString().getBytes(StandardCharsets.UTF_8));
        String signature = sign(headerEnc + "." + payloadEnc);
        return headerEnc + "." + payloadEnc + "." + signature;
    }

    public static JsonObject verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return null;
            }
            String expected = sign(parts[0] + "." + parts[1]);
            if (!java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                return null;
            }
            JsonObject payload = JsonParser.parseString(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)).getAsJsonObject();
            long exp = payload.get("exp").getAsLong();
            if (Instant.now().getEpochSecond() >= exp) {
                return null;
            }
            return payload;
        } catch (Exception e) {
            return null;
        }
    }

    private static String sign(String data) {
        try {
            String secret = System.getenv("MCP_JWT_SECRET");
            if (secret == null || secret.isBlank()) {
                secret = DEFAULT_SECRET;
            }
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return b64Url(digest);
        } catch (Exception e) {
            throw new RuntimeException("JWT signing failed", e);
        }
    }

    private static String b64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
