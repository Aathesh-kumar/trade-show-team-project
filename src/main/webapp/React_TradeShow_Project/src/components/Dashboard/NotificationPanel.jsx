import DashboardStyles from '../../styles/Dashboard.module.css';
import { useGet } from '../Hooks/useGet';
import { useEffect, useState } from 'react';
import PaginationControls from '../Common/PaginationControls';
import LoadingSkeleton from '../Loading/LoadingSkeleton';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';

export default function NotificationPanel({ isOpen, onClose }) {
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { data: notificationsData = [], refetch, loading } = useGet('/notification', {
    immediate: isOpen,
    params: { limit: 300, offset: 0 },
    dependencies: [isOpen]
  });
  const allNotifications = Array.isArray(notificationsData) ? notificationsData : [];
  const totalItems = allNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const notifications = allNotifications.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    setPage(1);
    return undefined;
  }, [isOpen, refetch]);

  if (!isOpen) {
    return null;
  }

  const markAllRead = async () => {
    await fetch(buildUrl('/notification/read-all'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    refetch();
  };

  const clearAll = async () => {
    await fetch(buildUrl('/notification/all'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    setPage(1);
    refetch();
  };

  const clearOne = async (id) => {
    await fetch(buildUrl(`/notification/${id}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    refetch();
  };

  return (
    <div className={DashboardStyles.notificationOverlay} onClick={onClose}>
      <div className={DashboardStyles.notificationPanel} onClick={(e) => e.stopPropagation()}>
        <div className={DashboardStyles.notificationHeader}>
          <h3>Notifications</h3>
          <div className={DashboardStyles.notificationHeaderActions}>
            <button className={DashboardStyles.notificationActionBtn} onClick={markAllRead}>Mark all read</button>
            <button className={DashboardStyles.notificationClearBtn} onClick={clearAll}>Clear all</button>
          </div>
        </div>
        <div className={DashboardStyles.notificationList}>
          {loading && <LoadingSkeleton type="text" lines={6} />}
          {notifications.length === 0 && (
            <p className={DashboardStyles.emptyState}>No notifications yet.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`${DashboardStyles.notificationItem} ${DashboardStyles[`severity${String(n.severity || 'info').toLowerCase()}`] || ''}`}
            >
              <div className={DashboardStyles.notificationMeta}>
                <strong>{n.title}</strong>
                <span className={DashboardStyles.notificationSeverity}>{n.severity || 'info'}</span>
              </div>
              <p className={DashboardStyles.notificationInfo}>{n.message}</p>
              <div className={DashboardStyles.notificationFooter}>
                <small className={DashboardStyles.notificationTime} title={String(n.createdAt || '-')}>
                  {String(n.createdAt || '-')}
                </small>
                <button className={DashboardStyles.notificationClearBtn} onClick={() => clearOne(n.id)}>
                  Clear
                </button>
              </div>
            </div>
          ))}
        </div>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
