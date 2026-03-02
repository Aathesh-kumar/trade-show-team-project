package com.tradeshow.pulse24x7.mcp.controller;

import com.google.gson.JsonObject;
import com.tradeshow.pulse24x7.mcp.model.User;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;
import com.tradeshow.pulse24x7.mcp.service.UserAuthService;
import com.tradeshow.pulse24x7.mcp.service.UserEmailSettingsService;
import com.tradeshow.pulse24x7.mcp.utils.JsonUtil;
import com.tradeshow.pulse24x7.mcp.utils.JwtUtil;
import com.tradeshow.pulse24x7.mcp.utils.ServletUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/user-auth/*")
public class UserAuthServlet extends HttpServlet {
    private UserAuthService userAuthService;
    private UserEmailSettingsService userEmailSettingsService;

    @Override
    public void init() throws ServletException {
        super.init();
        userAuthService = new UserAuthService();
        userEmailSettingsService = new UserEmailSettingsService();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/signup".equals(pathInfo)) {
            handleSignup(req, resp);
            return;
        }
        if ("/login".equals(pathInfo)) {
            handleLogin(req, resp);
            return;
        }
        if ("/zoho".equals(pathInfo)) {
            handleZohoLogin(req, resp);
            return;
        }
        if ("/forgot-password/send-otp".equals(pathInfo)) {
            handleForgotPasswordSendOtp(req, resp);
            return;
        }
        if ("/forgot-password/reset".equals(pathInfo)) {
            handleForgotPasswordReset(req, resp);
            return;
        }
        if ("/email-change/send-otp".equals(pathInfo)) {
            handleEmailChangeSendOtp(req, resp);
            return;
        }
        if ("/email-change/confirm".equals(pathInfo)) {
            handleEmailChangeConfirm(req, resp);
            return;
        }
        sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if ("/email-settings".equals(pathInfo)) {
            handleGetEmailSettings(req, resp);
            return;
        }
        if (!"/me".equals(pathInfo)) {
            sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        User user = userAuthService.findById((Long) uid);
        if (user == null) {
            sendErrorResponse(resp, "User not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, toSafeUser(user));
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        initResponse(resp);
        String pathInfo = req.getPathInfo();
        if (!"/email-settings".equals(pathInfo)) {
            sendErrorResponse(resp, "Invalid endpoint", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long userId)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        JsonObject payload = ServletUtil.readJsonBody(req);
        User currentUser = userAuthService.findById(userId);
        if (currentUser == null) {
            sendErrorResponse(resp, "User not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        UserEmailSettings settings = new UserEmailSettings();
        settings.setUserId(userId);
        settings.setAlertsEnabled(ServletUtil.getBoolean(payload, "alertsEnabled", true));
        settings.setReceiverEmail(ServletUtil.getString(payload, "receiverEmail", null));
        settings.setMinSeverity(ServletUtil.getString(payload, "minSeverity", "warning"));
        settings.setIncludeServerAlerts(ServletUtil.getBoolean(payload, "includeServerAlerts", true));
        settings.setIncludeToolAlerts(ServletUtil.getBoolean(payload, "includeToolAlerts", true));
        settings.setIncludeSystemAlerts(ServletUtil.getBoolean(payload, "includeSystemAlerts", true));

        boolean saved = userEmailSettingsService.save(settings);
        if (!saved) {
            sendErrorResponse(resp, "Failed to save email settings", HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }
        sendSuccessResponse(resp, userEmailSettingsService.getByUserId(userId));
    }

    private void handleSignup(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String fullName = ServletUtil.getString(payload, "fullName", null);
        String email = ServletUtil.getString(payload, "email", null);
        String password = ServletUtil.getString(payload, "password", null);
        User user = userAuthService.signup(fullName, email, password);
        if (user == null) {
            sendErrorResponse(resp, "Signup failed. Password must be at least 8 chars with uppercase, lowercase, and special character.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        String token = JwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(user));
        sendSuccessResponse(resp, response);
    }

    private void handleLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String email = ServletUtil.getString(payload, "email", null);
        String password = ServletUtil.getString(payload, "password", null);
        User user = userAuthService.login(email, password);
        if (user == null) {
            sendErrorResponse(resp, "Invalid email or password", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String token = JwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(user));
        sendSuccessResponse(resp, response);
    }

    private void handleZohoLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String code = ServletUtil.getString(payload, "code", null);
        String redirectUri = ServletUtil.getString(payload, "redirectUri", null);
        String zohoBaseUrl = ServletUtil.getString(payload, "zohoBaseUrl", null);
        User user = userAuthService.loginWithZoho(code, redirectUri, zohoBaseUrl);
        if (user == null) {
            sendErrorResponse(resp, "Zoho authentication failed", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        String token = JwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(user));
        sendSuccessResponse(resp, response);
    }

    private void handleGetEmailSettings(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long userId)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        UserEmailSettings settings = userEmailSettingsService.getByUserId(userId);
        if (settings == null) {
            sendErrorResponse(resp, "Settings not found", HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        sendSuccessResponse(resp, settings);
    }

    private void handleForgotPasswordSendOtp(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String email = ServletUtil.getString(payload, "email", null);
        boolean ok = userAuthService.requestPasswordResetTotp(email);
        if (!ok) {
            sendErrorResponse(
                    resp,
                    "Unable to send verification code. Check SMTP app password configuration (MCP_MAIL_ZOHO_PASSWORD) and retry.",
                    HttpServletResponse.SC_BAD_REQUEST
            );
            return;
        }
        sendSuccessResponse(resp, Map.of(
                "message", "If this email is registered, a verification code has been sent."
        ));
    }

    private void handleForgotPasswordReset(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        JsonObject payload = ServletUtil.readJsonBody(req);
        String email = ServletUtil.getString(payload, "email", null);
        String otpCode = ServletUtil.getString(payload, "otpCode", null);
        String newPassword = ServletUtil.getString(payload, "newPassword", null);
        boolean reset = userAuthService.resetPasswordWithTotp(email, otpCode, newPassword);
        if (!reset) {
            sendErrorResponse(resp, "Invalid/expired verification code or weak password. Use at least 8 chars with uppercase, lowercase, and special character.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        sendSuccessResponse(resp, Map.of("message", "Password reset successful. Please sign in with your new password."));
    }

    private void handleEmailChangeSendOtp(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long userId)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        JsonObject payload = ServletUtil.readJsonBody(req);
        String currentPassword = ServletUtil.getString(payload, "currentPassword", null);
        String newEmail = ServletUtil.getString(payload, "newEmail", null);
        boolean ok = userAuthService.requestEmailChangeTotp(userId, currentPassword, newEmail);
        if (!ok) {
            sendErrorResponse(resp, "Unable to send verification code. Check credentials and new email.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        sendSuccessResponse(resp, Map.of(
                "message", "Verification code has been sent to your new email."
        ));
    }

    private void handleEmailChangeConfirm(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Object uid = req.getAttribute("userId");
        if (!(uid instanceof Long userId)) {
            sendErrorResponse(resp, "Unauthorized", HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        JsonObject payload = ServletUtil.readJsonBody(req);
        String newEmail = ServletUtil.getString(payload, "newEmail", null);
        String otpCode = ServletUtil.getString(payload, "otpCode", null);
        User updatedUser = userAuthService.confirmEmailChange(userId, newEmail, otpCode);
        if (updatedUser == null) {
            sendErrorResponse(resp, "Invalid or expired verification code.", HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        String token = JwtUtil.generateToken(updatedUser.getId(), updatedUser.getEmail(), updatedUser.getRole(), 8 * 3600L);
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", toSafeUser(updatedUser));
        sendSuccessResponse(resp, response);
    }

    private Map<String, Object> toSafeUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("fullName", user.getFullName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole());
        map.put("createdAt", user.getCreatedAt());
        return map;
    }

    private void initResponse(HttpServletResponse resp) {
        resp.setContentType(String.valueOf(ContentType.APPLICATION_JSON));
        resp.setCharacterEncoding(String.valueOf(StandardCharsets.UTF_8));
    }

    private void sendSuccessResponse(HttpServletResponse resp, Object data) throws IOException {
        JsonObject response = JsonUtil.createSuccessResponse(data);
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(response.toString());
    }

    private void sendErrorResponse(HttpServletResponse resp, String message, int statusCode) throws IOException {
        JsonObject response = JsonUtil.createErrorResponse(message);
        resp.setStatus(statusCode);
        resp.getWriter().write(response.toString());
    }
}
