import DashboardStyles from '../../styles/Dashboard.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import PaginationControls from '../Common/PaginationControls';
import LoadingSkeleton from '../Loading/LoadingSkeleton';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';

export default function NotificationPanel({ isOpen, onClose, notificationsData = [], loading = false, onNotificationsChanged, openCycle = 0 }) {
  const [page, setPage] = useState(1);
  const [panelLoading, setPanelLoading] = useState(true);
  const [displayNotifications, setDisplayNotifications] = useState([]);
  const openStartedAtRef = useRef(0);
  const loadingTimerRef = useRef(null);
  const pageSize = 12;
  const allNotifications = Array.isArray(notificationsData) ? notificationsData : [];
  const totalItems = allNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const notifications = allNotifications.slice((page - 1) * pageSize, page * pageSize);
  const openNotifications = useMemo(() => {
    if (!isOpen) {
      return [];
    }
    return notifications;
  }, [isOpen, notifications]);
  const hasMarkedReadRef = useRef(false);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (isOpen) {
      setPanelLoading(true);
      setDisplayNotifications([]);
      openStartedAtRef.current = Date.now();
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  }, [isOpen, openCycle]);

  const markAllRead = async () => {
    await fetch(buildUrl('/notification/read-all'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    onNotificationsChanged?.();
  };

  useEffect(() => {
    if (isOpen && !hasMarkedReadRef.current) {
      hasMarkedReadRef.current = true;
      markAllRead();
    }
    if (!isOpen) {
      hasMarkedReadRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!loading) {
      const elapsed = Date.now() - (openStartedAtRef.current || Date.now());
      const remaining = Math.max(0, 250 - elapsed);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
      loadingTimerRef.current = setTimeout(() => {
        setPanelLoading(false);
        setDisplayNotifications(openNotifications);
      }, remaining);
    }
  }, [isOpen, loading, openNotifications]);

  if (!isOpen) {
    return null;
  }

  const showLoading = panelLoading || loading;

  const clearAll = async () => {
    await fetch(buildUrl('/notification/all'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    setPage(1);
    onNotificationsChanged?.();
  };

  const clearOne = async (id) => {
    await fetch(buildUrl(`/notification/${id}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    }).then(parseApiResponse).catch(() => null);
    onNotificationsChanged?.();
  };

  return (
    <div className={DashboardStyles.notificationOverlay} onClick={onClose}>
      <div className={DashboardStyles.notificationPanel} onClick={(e) => e.stopPropagation()}>
        <div className={DashboardStyles.notificationHeader}>
          <h3>Notifications</h3>
          <div className={DashboardStyles.notificationHeaderActions}>
            <button className={DashboardStyles.notificationClearBtn} onClick={clearAll}>Clear all</button>
          </div>
        </div>
        <div className={DashboardStyles.notificationList}>
          {showLoading ? (
            <LoadingSkeleton type="text" lines={6} />
          ) : (
            <>
              {displayNotifications.length === 0 && (
                <p className={DashboardStyles.emptyState}>No notifications yet.</p>
              )}
              {displayNotifications.map((n) => (
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
                      {formatTime(n.createdAt)}
                    </small>
                    <button className={DashboardStyles.notificationClearBtn} onClick={() => clearOne(n.id)}>
                      Clear
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
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

function formatTime(raw) {
  if (!raw) {
    return '-';
  }
  const ts = new Date(String(raw).replace(' ', 'T'));
  if (Number.isNaN(ts.getTime())) {
    return String(raw);
  }
  return ts.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
