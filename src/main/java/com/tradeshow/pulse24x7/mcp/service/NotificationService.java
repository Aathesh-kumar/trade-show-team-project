package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.NotificationDAO;
import com.tradeshow.pulse24x7.mcp.dao.UserDAO;
import com.tradeshow.pulse24x7.mcp.model.Notification;
import com.tradeshow.pulse24x7.mcp.model.NotificationRecipient;
import com.tradeshow.pulse24x7.mcp.model.UserEmailSettings;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.util.List;

public class NotificationService {
    private static final Logger logger = LogManager.getLogger(NotificationService.class);
    private final NotificationDAO notificationDAO;
    private final UserDAO userDAO;
    private final UserEmailSettingsService userEmailSettingsService;
    private final NotificationEmailService notificationEmailService;

    public NotificationService() {
        this.notificationDAO = new NotificationDAO();
        this.userDAO = new UserDAO();
        this.userEmailSettingsService = new UserEmailSettingsService();
        this.notificationEmailService = new NotificationEmailService();
    }

    public boolean notify(Integer serverId, String category, String severity, String title, String message) {
        if (serverId == null || serverId <= 0) {
            logger.warn("Skipping notification insert because serverId is null/invalid. category={}, title={}", category, title);
            return false;
        }
        Notification n = new Notification();
        n.setServerId(serverId);
        n.setCategory(category == null ? "system" : category);
        n.setSeverity(severity == null ? "info" : severity);
        n.setTitle(title == null ? "Notification" : title);
        n.setMessage(message == null ? "" : message);
        Notification inserted = notificationDAO.insertAndReturn(n);
        if (inserted == null) {
            return false;
        }
        dispatchEmailIfEligible(inserted);
        return true;
    }

    public List<Notification> getRecent(int limit, int offset) {
        return notificationDAO.getRecentByServer(null, limit, offset);
    }

    public List<Notification> getRecentByServer(Integer serverId, int limit, int offset) {
        return notificationDAO.getRecentByServer(serverId, limit, offset);
    }

    public List<Notification> getRecentByUser(Long userId, Integer serverId, int limit, int offset) {
        return notificationDAO.getRecentByUser(userId, serverId, limit, offset);
    }

    public boolean markRead(long id) {
        return notificationDAO.markRead(id);
    }

    public boolean markReadForUser(long id, long userId) {
        return notificationDAO.markReadForUser(id, userId);
    }

    public int markAllRead() {
        return notificationDAO.markAllReadByServer(null);
    }

    public int markAllReadByServer(Integer serverId) {
        return notificationDAO.markAllReadByServer(serverId);
    }

    public int markAllReadByUser(Long userId, Integer serverId) {
        return notificationDAO.markAllReadByUser(userId, serverId);
    }

    public long countUnread() {
        return notificationDAO.countUnreadByServer(null);
    }

    public long countUnreadByServer(Integer serverId) {
        return notificationDAO.countUnreadByServer(serverId);
    }

    public long countUnreadByUser(Long userId, Integer serverId) {
        return notificationDAO.countUnreadByUser(userId, serverId);
    }

    public boolean clearById(long id) {
        return notificationDAO.deleteById(id);
    }

    public boolean clearByIdForUser(long id, long userId) {
        return notificationDAO.deleteByIdForUser(id, userId);
    }

    public int clearAll() {
        return notificationDAO.deleteAllByServer(null);
    }

    public int clearAllByServer(Integer serverId) {
        return notificationDAO.deleteAllByServer(serverId);
    }

    public int clearAllByUser(Long userId, Integer serverId) {
        return notificationDAO.deleteAllByUser(userId, serverId);
    }

    private void dispatchEmailIfEligible(Notification notification) {
        try {
            if (notification.getServerId() == null) {
                return;
            }
            NotificationRecipient recipient = userDAO.findNotificationRecipientByServerId(notification.getServerId());
            if (recipient == null || recipient.getUserId() == null) {
                return;
            }
            UserEmailSettings settings = userEmailSettingsService.getByUserId(recipient.getUserId());
            if (settings == null) {
                return;
            }
            notificationEmailService.send(notification, recipient, settings);
        } catch (Exception e) {
            logger.error("Failed to dispatch notification email for notificationId={}", notification.getId(), e);
        }
    }
}
