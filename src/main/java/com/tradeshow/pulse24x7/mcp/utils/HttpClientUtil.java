package com.tradeshow.pulse24x7.mcp.utils;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.tradeshow.pulse24x7.mcp.model.HttpResult;
import jakarta.servlet.http.HttpServletRequest;
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

import java.io.BufferedReader;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class HttpClientUtil {
    private static final Logger logger = LogManager.getLogger(HttpClientUtil.class);

    public static JsonObject doPost(String url, Map<String, String> headers, String jsonPayload) {
        logger.info("Initiating POST request to: " + url);
        
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            URI uri = new URI(url);
            HttpHost target = new HttpHost(uri.getScheme(), uri.getHost(), uri.getPort());
            HttpPost httpPost = new HttpPost(uri);

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
                    return JsonParser.parseString(responseBody).getAsJsonObject();
                } else {
                    logger.error("POST failed | Status: {} | Body: {}", statusCode, responseBody);

                    String errorMessage = "Unknown error";

                    try {
                        JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();

                        if (json.has("data")) {
                            JsonObject data = json.getAsJsonObject("data");
                            if (data.has("message")) {
                                errorMessage = data.get("message").getAsString();
                            }
                        }
                    } catch (Exception parseEx) {
                        logger.warn("Failed to extract error message from response body");
                    }

                    throw new RuntimeException(errorMessage);
                }
            }

        } catch (ParseException e) {
            logger.error("Failed to parse response body", e);
            throw new RuntimeException("Failed to parse response body", e);
        } catch (URISyntaxException e) {
            logger.error("Invalid URL: {}", url, e);
            throw new RuntimeException("Invalid URL: " + url, e);
        } catch (IOException e) {
            logger.error("POST request failed for URL: {}", url, e);
            throw new RuntimeException("POST request failed for URL: " + url, e);
        }
    }

    public static JsonObject doGet(String url, Map<String, String> headers) {
        logger.info("Initiating GET request to: {}", url);
        
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            URI uri = new URI(url);
            HttpHost target = new HttpHost(uri.getScheme(), uri.getHost(), uri.getPort());
            HttpGet httpGet = new HttpGet(uri);

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
                    return JsonParser.parseString(responseBody).getAsJsonObject();
                } else {
                    logger.error("GET failed | Status: {} | Body: {}", statusCode, responseBody);
                    throw new RuntimeException("GET failed with status: " + statusCode);
                }
            }

        } catch (ParseException e) {
            logger.error("Failed to parse response body", e);
            throw new RuntimeException("Failed to parse response body", e);
        } catch (URISyntaxException e) {
            logger.error("Invalid URL: {}", url, e);
            throw new RuntimeException("Invalid URL: " + url, e);
        } catch (IOException e) {
            logger.error("GET request failed for URL: {}", url, e);
            throw new RuntimeException("GET request failed for URL: " + url, e);
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
        try {
            JsonObject response = doPost(url, headers, jsonBody);
            return new HttpResult(true, 200, response.toString(), null);
        } catch (RuntimeException e) {
            return new HttpResult(false, 400, null, e.getMessage());
        }
    }

    public static JsonObject jsonParser(HttpServletRequest req) throws IOException  {
        StringBuilder sb = new StringBuilder();
        String line;

        try (BufferedReader br = req.getReader()) {
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
        }

       return JsonParser.parseString(sb.toString()).getAsJsonObject();
    }
}