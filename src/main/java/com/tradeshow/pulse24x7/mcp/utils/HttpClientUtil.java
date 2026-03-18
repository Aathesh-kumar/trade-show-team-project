package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.protocol.HttpClientContext;
import org.apache.hc.core5.http.*;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.hc.core5.util.Timeout;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.util.Map;
import java.util.stream.Collectors;

public class HttpClientUtil {
    private static final Logger logger = LogManager.getLogger(HttpClientUtil.class);
    private static final int DEFAULT_TIMEOUT_MS = 10000;

    public static class HttpRequestException extends RuntimeException {
        private final int statusCode;
        private final String responseBody;

        public HttpRequestException(int statusCode, String message, String responseBody) {
            super(message);
            this.statusCode = statusCode;
            this.responseBody = responseBody;
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getResponseBody() {
            return responseBody;
        }
    }

    public static class HttpTimeoutException extends RuntimeException {
        private final int timeoutMs;
        private final String url;

        public HttpTimeoutException(String url, int timeoutMs, Throwable cause) {
            super("Request timed out after " + timeoutMs + " ms", cause);
            this.timeoutMs = timeoutMs;
            this.url = url;
        }

        public int getTimeoutMs() {
            return timeoutMs;
        }

        public String getUrl() {
            return url;
        }
    }

    public static JsonObject doPost(String url, Map<String, String> headers, String jsonPayload) {
        return doPost(url, headers, jsonPayload, null);
    }

    public static JsonObject doPost(String url, Map<String, String> headers, String jsonPayload, Integer timeoutMs) {
        logger.info("Initiating POST request to: " + url);
        
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            int effectiveTimeoutMs = normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS);
            URI uri = new URI(url);
            HttpHost target = new HttpHost(uri.getScheme(), uri.getHost(), uri.getPort());
            HttpPost httpPost = new HttpPost(uri);
            httpPost.setConfig(RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .setResponseTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .build());

            // Add headers
            if (headers != null) {
                headers.forEach((key, value) -> {
                    httpPost.addHeader(key, value);
                    logger.debug("Added header: " + key +" = "+ value);
                });
            }

            // Add JSON payload
            if (jsonPayload != null && !jsonPayload.isEmpty()) {
                httpPost.setEntity(new StringEntity(jsonPayload, ContentType.APPLICATION_JSON));
                logger.debug("Request payload: {}", jsonPayload);
            }

            HttpClientContext context = HttpClientContext.create();

            try (ClassicHttpResponse response = client.executeOpen(target, httpPost, context)) {
                int statusCode = response.getCode();
                HttpEntity responseEntity = response.getEntity();
                String responseBody = (responseEntity != null)
                        ? EntityUtils.toString(responseEntity, StandardCharsets.UTF_8)
                        : "{}";

                logger.info("POST response status: {}", statusCode);
                logger.debug("POST response body: {}", responseBody);

                if (statusCode >= 200 && statusCode < 300) {
                    return parseToJson(responseBody);
                } else {
                    logger.error("POST failed | Status: {} | Body: {}", statusCode, responseBody);
                    String errorMessage = extractErrorMessage(responseBody, statusCode);
                    throw new HttpRequestException(statusCode, errorMessage, responseBody);
                }
            }

        } catch (ParseException e) {
            logger.error("Failed to parse response body", e);
            throw new RuntimeException("Failed to parse response body", e);
        } catch (URISyntaxException e) {
            logger.error("Invalid URL: {}", url, e);
            throw new RuntimeException("Invalid URL: " + url, e);
        } catch (IOException e) {
            if (isTimeoutException(e)) {
                throw new HttpTimeoutException(url, normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS), e);
            }
            logger.error("POST request failed for URL: {}", url, e);
            throw new RuntimeException("POST request failed for URL: " + url + ": " + e.getMessage(), e);
        }
    }

    public static JsonObject doGet(String url, Map<String, String> headers) {
        return doGet(url, headers, null);
    }

    public static JsonObject doGet(String url, Map<String, String> headers, Integer timeoutMs) {
        logger.info("Initiating GET request to: {}", url);
        
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            int effectiveTimeoutMs = normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS);
            URI uri = new URI(url);
            HttpHost target = new HttpHost(uri.getScheme(), uri.getHost(), uri.getPort());
            HttpGet httpGet = new HttpGet(uri);
            httpGet.setConfig(RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .setResponseTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .build());

            // Add headers
            if (headers != null) {
                headers.forEach((key, value) -> {
                    httpGet.addHeader(key, value);
                    logger.debug("Added header: {} = {}", key, value);
                });
            }

            HttpClientContext context = HttpClientContext.create();

            try (ClassicHttpResponse response = client.executeOpen(target, httpGet, context)) {
                int statusCode = response.getCode();
                HttpEntity responseEntity = response.getEntity();
                String responseBody = (responseEntity != null)
                        ? EntityUtils.toString(responseEntity, StandardCharsets.UTF_8)
                        : "{}";

                logger.info("GET response status: {}", statusCode);
                logger.debug("GET response body: {}", responseBody);

                if (statusCode >= 200 && statusCode < 300) {
                    return parseToJson(responseBody);
                } else {
                    logger.error("GET failed | Status: {} | Body: {}", statusCode, responseBody);
                    String errorMessage = extractErrorMessage(responseBody, statusCode);
                    throw new HttpRequestException(statusCode, errorMessage, responseBody);
                }
            }

        } catch (ParseException e) {
            logger.error("Failed to parse response body", e);
            throw new RuntimeException("Failed to parse response body", e);
        } catch (URISyntaxException e) {
            logger.error("Invalid URL: {}", url, e);
            throw new RuntimeException("Invalid URL: " + url, e);
        } catch (IOException e) {
            if (isTimeoutException(e)) {
                throw new HttpTimeoutException(url, normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS), e);
            }
            logger.error("GET request failed for URL: {}", url, e);
            throw new RuntimeException("GET request failed for URL: " + url + ": " + e.getMessage(), e);
        }
    }

    public static JsonObject doPostForm(String url, Map<String, String> headers, Map<String, String> formFields) {
        return doPostForm(url, headers, formFields, null);
    }

    public static JsonObject doPostForm(String url, Map<String, String> headers, Map<String, String> formFields, Integer timeoutMs) {
        String formBody = formFields.entrySet().stream()
                .filter(e -> e.getValue() != null)
                .map(e -> urlEncode(e.getKey()) + "=" + urlEncode(e.getValue()))
                .collect(Collectors.joining("&"));

        Map<String, String> finalHeaders = new java.util.HashMap<>();
        finalHeaders.put("Content-Type", "application/x-www-form-urlencoded");
        if (headers != null) {
            finalHeaders.putAll(headers);
        }

        logger.info("Initiating FORM POST request to: {}", url);
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            int effectiveTimeoutMs = normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS);
            URI uri = new URI(url);
            HttpHost target = new HttpHost(uri.getScheme(), uri.getHost(), uri.getPort());
            HttpPost httpPost = new HttpPost(uri);
            httpPost.setConfig(RequestConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .setResponseTimeout(Timeout.ofMilliseconds(effectiveTimeoutMs))
                    .build());
            finalHeaders.forEach(httpPost::addHeader);
            httpPost.setEntity(new StringEntity(formBody, ContentType.APPLICATION_FORM_URLENCODED));

            HttpClientContext context = HttpClientContext.create();
            try (ClassicHttpResponse response = client.executeOpen(target, httpPost, context)) {
                int statusCode = response.getCode();
                String responseBody = response.getEntity() != null
                        ? EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8)
                        : "{}";
                if (statusCode >= 200 && statusCode < 300) {
                    return parseToJson(responseBody);
                }
                String errorMessage = extractErrorMessage(responseBody, statusCode);
                throw new HttpRequestException(statusCode, errorMessage, responseBody);
            }
        } catch (HttpRequestException e) {
            throw e;
        } catch (Exception e) {
            if (e instanceof IOException ioEx && isTimeoutException(ioEx)) {
                throw new HttpTimeoutException(url, normalizeTimeoutMs(timeoutMs, DEFAULT_TIMEOUT_MS), ioEx);
            }
            throw new RuntimeException("FORM POST request failed for URL: " + url, e);
        }
    }

    public static boolean isServerReachable(String url) {
        try {
            doGet(url, null);
            return true;
        } catch (Exception e) {
            logger.warn("Server not reachable: {}", url);
            return false;
        }
    }

    public static HttpResult canPingServer(String url, Map<String, String> headers, String jsonBody) {
        return canPingServer(url, headers, jsonBody, null);
    }

    public static HttpResult canPingServer(String url, Map<String, String> headers, String jsonBody, Integer timeoutMs) {
        try {
            JsonObject response = doPost(url, headers, jsonBody, timeoutMs);
            return new HttpResult(true, 200, response.toString(), null);
        } catch (HttpTimeoutException e) {
            return new HttpResult(false, 504, null, e.getMessage());
        } catch (RuntimeException e) {
            return new HttpResult(false, 400, null, e.getMessage());
        }
    }

    private static JsonObject parseToJson(String body) {
        if (body == null || body.isBlank()) {
            return new JsonObject();
        }
        try {
            return JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception ex) {
            JsonObject fallback = new JsonObject();
            fallback.addProperty("raw", body);
            return fallback;
        }
    }

    private static String extractErrorMessage(String responseBody, int statusCode) {
        if (responseBody == null || responseBody.isBlank()) {
            return "Request failed with status " + statusCode;
        }
        try {
            JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();
            if (json.has("message") && !json.get("message").isJsonNull()) {
                return json.get("message").getAsString();
            }
            if (json.has("error") && !json.get("error").isJsonNull()) {
                return json.get("error").getAsString();
            }
            if (json.has("data") && json.get("data").isJsonObject()) {
                JsonObject data = json.getAsJsonObject("data");
                if (data.has("message") && !data.get("message").isJsonNull()) {
                    return data.get("message").getAsString();
                }
                if (data.has("error") && !data.get("error").isJsonNull()) {
                    return data.get("error").getAsString();
                }
            }
        } catch (Exception parseEx) {
            logger.warn("Failed to extract structured error message from response body");
        }
        return "Request failed with status " + statusCode + ": " + responseBody;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static int normalizeTimeoutMs(Integer timeoutMs, int fallback) {
        int value = timeoutMs == null ? fallback : timeoutMs;
        if (value <= 0) {
            value = fallback;
        }
        // Avoid effectively "infinite" values from the UI or callers.
        return Math.max(500, Math.min(300_000, value));
    }

    private static boolean isTimeoutException(IOException e) {
        if (e == null) {
            return false;
        }
        String name = e.getClass().getName();
        if (name != null && name.toLowerCase().contains("timeout")) {
            return true;
        }
        Throwable cause = e.getCause();
        return (cause instanceof IOException io) && isTimeoutException(io);
    }
}
