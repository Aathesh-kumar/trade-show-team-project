package com.tradeshow.pulse24x7.mcp.service;

import com.tradeshow.pulse24x7.mcp.dao.NotificationDAO;
import com.tradeshow.pulse24x7.mcp.model.Notification;

import java.util.List;

public class NotificationService {
    private final NotificationDAO notificationDAO;

    public NotificationService() {
        this.notificationDAO = new NotificationDAO();
    }

    public boolean notify(Integer serverId, String category, String severity, String title, String message) {
        Notification n = new Notification();
        n.setServerId(serverId);
        n.setCategory(category == null ? "system" : category);
        n.setSeverity(severity == null ? "info" : severity);
        n.setTitle(title == null ? "Notification" : title);
        n.setMessage(message == null ? "" : message);
        return notificationDAO.insert(n);
    }

    public List<Notification> getRecent(int limit) {
        return notificationDAO.getRecent(limit);
    }

    public boolean markRead(long id) {
        return notificationDAO.markRead(id);
    }

    public int markAllRead() {
        return notificationDAO.markAllRead();
    }

    public long countUnread() {
        return notificationDAO.countUnread();
    }
}
