import DashboardStyles from '../../styles/Dashboard.module.css';
import { useGet } from '../Hooks/useGet';
import { buildUrl, parseApiResponse } from '../../services/api';

export default function NotificationPanel({ isOpen, onClose }) {
  const { data: notifications = [], refetch } = useGet('/notification', {
    immediate: isOpen,
    params: { limit: 50 },
    dependencies: [isOpen]
  });

  if (!isOpen) {
    return null;
  }

  const markAllRead = async () => {
    await fetch(buildUrl('/notification/read-all'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(parseApiResponse).catch(() => null);
    refetch();
  };

  return (
    <div className={DashboardStyles.notificationOverlay} onClick={onClose}>
      <div className={DashboardStyles.notificationPanel} onClick={(e) => e.stopPropagation()}>
        <div className={DashboardStyles.notificationHeader}>
          <h3>Notifications</h3>
          <button className={DashboardStyles.notificationBtn} onClick={markAllRead}>Mark all read</button>
        </div>
        <div className={DashboardStyles.notificationList}>
          {notifications.length === 0 && (
            <p className={DashboardStyles.emptyState}>No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className={DashboardStyles.notificationItem}>
              <p><strong>{n.title}</strong></p>
              <p>{n.message}</p>
              <small>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
