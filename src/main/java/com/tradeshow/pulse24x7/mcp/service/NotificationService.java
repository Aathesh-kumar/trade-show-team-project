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
        Notification target = notificationDAO.getByIdForUser(id, userId);
        boolean deleted = notificationDAO.deleteByIdForUser(id, userId);
        if (deleted) {
            dispatchDeleteEmailIfEligible(target);
        }
        return deleted;
    }

    public int clearAll() {
        return notificationDAO.deleteAllByServer(null);
    }

    public int clearAllByServer(Integer serverId) {
        return notificationDAO.deleteAllByServer(serverId);
    }

    public int clearAllByUser(Long userId, Integer serverId) {
        List<Notification> toDelete = notificationDAO.getAllByUser(userId, serverId);
        int deleted = notificationDAO.deleteAllByUser(userId, serverId);
        if (deleted > 0 && toDelete != null && !toDelete.isEmpty()) {
            for (Notification notification : toDelete) {
                dispatchDeleteEmailIfEligible(notification);
            }
        }
        return deleted;
    }

    private void dispatchEmailIfEligible(Notification notification) {
        try {
            NotificationRecipient recipient = resolveRecipient(notification);
            UserEmailSettings settings = resolveSettings(recipient);
            if (recipient == null || settings == null) return;
            notificationEmailService.send(notification, recipient, settings);
        } catch (Exception e) {
            logger.error("Failed to dispatch notification email for notificationId={}", notification.getId(), e);
        }
    }

    private void dispatchDeleteEmailIfEligible(Notification notification) {
        try {
            NotificationRecipient recipient = resolveRecipient(notification);
            UserEmailSettings settings = resolveSettings(recipient);
            if (recipient == null || settings == null) return;
            notificationEmailService.sendNotificationDeleted(notification, recipient, settings);
        } catch (Exception e) {
            logger.error("Failed to dispatch deletion email for notificationId={}", notification == null ? null : notification.getId(), e);
        }
    }

    private NotificationRecipient resolveRecipient(Notification notification) {
        if (notification == null || notification.getServerId() == null) {
            return null;
        }
        NotificationRecipient recipient = userDAO.findNotificationRecipientByServerId(notification.getServerId());
        if (recipient == null || recipient.getUserId() == null) {
            return null;
        }
        return recipient;
    }

    private UserEmailSettings resolveSettings(NotificationRecipient recipient) {
        if (recipient == null || recipient.getUserId() == null) {
            return null;
        }
        return userEmailSettingsService.getByUserId(recipient.getUserId());
    }
}
