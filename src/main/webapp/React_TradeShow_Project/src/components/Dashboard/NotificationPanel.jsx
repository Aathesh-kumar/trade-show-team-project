import { useEffect, useMemo, useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import { useGet } from '../Hooks/useGet';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';
import PaginationControls from '../Common/PaginationControls';

const PAGE_SIZE = 8;

export default function NotificationPanel({ isOpen, onClose }) {
  const [page, setPage] = useState(1);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [refreshTick, setRefreshTick] = useState(0);
  const { data: notificationsData = [], refetch } = useGet('/notification', {
    immediate: isOpen,
    params: { limit: 200 },
    dependencies: [isOpen, refreshTick]
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const id = setInterval(() => refetch(), 10_000);
    const onRefresh = () => setRefreshTick((prev) => prev + 1);
    window.addEventListener('pulse24x7-notification-refresh', onRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener('pulse24x7-notification-refresh', onRefresh);
    };
  }, [isOpen, refetch]);

  const notifications = useMemo(() => {
    const rows = Array.isArray(notificationsData) ? notificationsData : [];
    return rows.filter((item) => !removedIds.has(String(item.id)));
  }, [notificationsData, removedIds]);

  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = notifications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    setRemovedIds(new Set((notifications || []).map((n) => String(n.id))));
    window.dispatchEvent(new CustomEvent('pulse24x7-notification-refresh'));
    refetch();
  };

  const clearOne = async (id) => {
    await fetch(buildUrl('/notification'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ id })
    }).then(parseApiResponse).catch(() => null);
    setRemovedIds((prev) => new Set(prev).add(String(id)));
    window.dispatchEvent(new CustomEvent('pulse24x7-notification-refresh'));
  };

  return (
    <div className={DashboardStyles.notificationOverlay} onClick={onClose}>
      <div className={DashboardStyles.notificationPanel} onClick={(e) => e.stopPropagation()}>
        <div className={DashboardStyles.notificationHeader}>
          <h3>Notifications</h3>
          <div className={DashboardStyles.notificationHeaderActions}>
            <button className={DashboardStyles.notificationActionBtn} onClick={() => refetch()}>Refresh</button>
            <button className={DashboardStyles.notificationActionBtn} onClick={markAllRead}>Clear all</button>
          </div>
        </div>
        <div className={DashboardStyles.notificationList}>
          {notifications.length === 0 && (
            <p className={DashboardStyles.emptyState}>No notifications yet.</p>
          )}
          {paged.map((n) => (
            <div key={n.id} className={`${DashboardStyles.notificationItem} ${DashboardStyles[`severity${normalizeSeverity(n.severity)}`] || ''}`}>
              <div className={DashboardStyles.notificationMeta}>
                <strong>{n.title}</strong>
                <span className={DashboardStyles.notificationSeverity}>{normalizeSeverity(n.severity)}</span>
              </div>
              <p className={DashboardStyles.notificationInfo}>{n.message}</p>
              <div className={DashboardStyles.notificationFooter}>
                <small className={DashboardStyles.notificationTime}>{formatNotificationTime(n.createdAt)}</small>
                <button type="button" className={DashboardStyles.notificationClearBtn} onClick={() => clearOne(n.id)}>Clear</button>
              </div>
            </div>
          ))}
        </div>
        <PaginationControls
          page={safePage}
          totalPages={totalPages}
          totalItems={notifications.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

function normalizeSeverity(value) {
  const severity = String(value || 'info').toLowerCase();
  if (severity === 'error' || severity === 'warning' || severity === 'info' || severity === 'success') {
    return severity;
  }
  return 'info';
}

function formatNotificationTime(rawTime) {
  if (!rawTime) {
    return '';
  }
  const raw = String(rawTime).trim();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
