import { useEffect, useMemo, useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import StatCard from './StatCard';
import SystemHealth from './SystemHealth';
import QuickActions from './QuickActions';
import ActiveServers from './ActiveServers';
import TopPerformingTools from './TopPerformingTools';
import { MdInfo, MdSync, MdError, MdSpeed } from 'react-icons/md';
import { IoNotifications } from 'react-icons/io5';
import { useGet } from '../Hooks/useGet';
import NotificationPanel from './NotificationPanel';
import { buildUrl, getAuthHeaders } from '../../services/api';
import useBufferedLoading from '../Hooks/useBufferedLoading';
import LoadingSkeleton from '../Loading/LoadingSkeleton';
import CursorStyle from "../../styles/cursor.module.css";

export default function Dashboard({ selectedServer, onNavigate, onSelectServer }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationOpenCycle, setNotificationOpenCycle] = useState(0);
    const [timeMode, setTimeMode] = useState('today');
    const serverId = selectedServer?.serverId;
    const { data: serversData } = useGet('/server/all', { immediate: true, dependencies: [serverId] });
    const { data: serverStatusesData } = useGet('/server/statuses', { immediate: true, dependencies: [serverId] });
    const timeParams = getTimeParams(timeMode);
    const { data: metrics, loading: metricsRawLoading } = useGet('/metrics/overview', {
        immediate: !!serverId,
        params: {
            serverId,
            hours: timeParams.hours,
            bucketMinutes: timeParams.bucketMinutes,
            bucketSeconds: timeParams.bucketSeconds
        },
        dependencies: [serverId, timeMode]
    });
    const metricsLoading = useBufferedLoading(metricsRawLoading, 1500);
    const { data: notificationsData, loading: notificationsLoading, refetch: refetchNotifications } = useGet('/notification', {
        immediate: true,
        params: { limit: 300, offset: 0 },
        dependencies: [serverId]
    });
    const notificationsBufferedLoading = useBufferedLoading(notificationsLoading, 280);
    const notificationsReady = Array.isArray(notificationsData);
    const notificationsLoadingView = notificationsBufferedLoading || !notificationsReady;
    const { data: unread, refetch: refetchUnread } = useGet('/notification/unread-count', {
        immediate: true,
        dependencies: [showNotifications, serverId]
    });
    const [dismissedHighAlerts, setDismissedHighAlerts] = useState(() => new Set());

    const highSeverityNotification = useMemo(() => {
        const list = Array.isArray(notificationsData) ? notificationsData : [];
        const ranked = list
            .filter((item) => isHighSeverity(item?.severity))
            .filter((item) => !dismissedHighAlerts.has(item?.id))
            .filter((item) => isRecentAlert(item?.createdAt, 2))
            .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
        return ranked[0] || null;
    }, [notificationsData, dismissedHighAlerts]);
    const statusNotification = useMemo(() => {
        const list = Array.isArray(notificationsData) ? notificationsData : [];
        const ranked = list
            .filter((item) => String(item?.category || '').toLowerCase() === 'server')
            .filter((item) => String(item?.title || '').toLowerCase() === 'server status')
            .filter((item) => !dismissedHighAlerts.has(item?.id))
            .filter((item) => isRecentAlert(item?.createdAt, 1))
            .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
        return ranked[0] || null;
    }, [notificationsData, dismissedHighAlerts]);
    const toastNotification = highSeverityNotification || statusNotification;
    const toastSeverityClass = toastNotification ? getAlertClass(toastNotification.severity) : '';

    useEffect(() => {
        if (!serverId) {
            return;
        }
        const runMonitor = () => {
            if (document.visibilityState === 'hidden') {
                return;
            }
            fetch(buildUrl('/server/monitor'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ serverId })
            }).catch(() => null);
        };
        runMonitor();
        const id = setInterval(runMonitor, 300_000);
        return () => clearInterval(id);
    }, [serverId]);

    useEffect(() => {
        if (!serverId) {
            return;
        }
        const refreshNotifications = () => {
            refetchNotifications();
            refetchUnread();
        };
        refreshNotifications();
        const id = setInterval(refreshNotifications, 30_000);
        return () => clearInterval(id);
    }, [serverId, refetchNotifications, refetchUnread]);

    useEffect(() => {
        if (!toastNotification?.id) {
            return;
        }
        const id = setTimeout(() => {
            setDismissedHighAlerts((prev) => {
                const next = new Set(prev);
                next.add(toastNotification.id);
                return next;
            });
        }, 8000);
        return () => clearTimeout(id);
    }, [toastNotification?.id]);
    const servers = Array.isArray(serverStatusesData) && serverStatusesData.length > 0
        ? serverStatusesData
        : (Array.isArray(serversData) ? serversData : []);

    const requestStats = metrics?.requestStats || {};
    const totalRequests = requestStats.totalRequests || 0;
    const totalErrors = requestStats.totalErrors || 0;
    const avgLatency = averageLatency(metrics?.topTools || []);

    if (!selectedServer) {
        return (
            <div className={DashboardStyles.dashboard}>
                <header className={DashboardStyles.header}>
                    <h1>Dashboard Overview</h1>
                </header>
                <div className={DashboardStyles.emptyState}>
                    Configure a server to view metrics and monitoring.
                </div>
            </div>
        );
    }

    return (
        <div className={`${DashboardStyles.dashboard} ${CursorStyle.cursorDefault}`}>
            <header className={DashboardStyles.header}>
                <h1>Dashboard Overview</h1>
                <div className={DashboardStyles.headerRight}>
                    <div className={DashboardStyles.systemStatus}>
                        <span className={DashboardStyles.statusDot}></span>
                        <span>System Online</span>
                    </div>
                    <button
                        className={DashboardStyles.notificationBtn}
                        onClick={() => {
                            setShowNotifications(true);
                            setNotificationOpenCycle(Date.now());
                        }}
                    >
                        <IoNotifications />
                        {(unread?.unreadCount || 0) > 0 && (
                            <span className={DashboardStyles.notificationCount}>{unread.unreadCount}</span>
                        )}
                    </button>
                </div>
            </header>

            <div className={DashboardStyles.statsGrid}>
                {metricsLoading ? (
                    <>
                        <LoadingSkeleton type="stat-card" />
                        <LoadingSkeleton type="stat-card" />
                        <LoadingSkeleton type="stat-card" />
                        <LoadingSkeleton type="stat-card" />
                    </>
                ) : (
                    <>
                        <StatCard
                            icon={<MdInfo />}
                            label="Uptime"
                            value={`${(metrics?.uptimePercent || 0).toFixed(1)}%`}
                            trend={`${metrics?.activeServerCount || 0} active servers`}
                            trendPositive={true}
                            iconBg="#3B82F6"
                        />
                        <StatCard
                            icon={<MdSync />}
                            label="Total Requests"
                            value={totalRequests.toLocaleString()}
                            trend="Live from request logs"
                            trendPositive={true}
                            iconBg="#06B6D4"
                        />
                        <StatCard
                            icon={<MdError />}
                            label="Error Rate"
                            value={totalRequests > 0 ? `${((totalErrors / totalRequests) * 100).toFixed(2)}%` : '0.00%'}
                            trend={`${totalErrors} failed requests`}
                            trendPositive={totalErrors === 0}
                            iconBg="#EF4444"
                        />
                        <StatCard
                            icon={<MdSpeed />}
                            label="Avg Latency"
                            value={`${Math.round(avgLatency)}ms`}
                            trend="Across top tools"
                            trendPositive={avgLatency <= 250}
                            iconBg="#F59E0B"
                        />
                    </>
                )}
            </div>

            <div className={DashboardStyles.mainGrid}>
                <SystemHealth
                    data={metrics?.throughput24h || []}
                    loading={metricsLoading}
                    timeMode={timeMode}
                    onChangeTimeMode={setTimeMode}
                />
                <div className={DashboardStyles.sidePanel}>
                    <QuickActions
                        onNavigate={onNavigate}
                        selectedServer={selectedServer}
                        onNotificationsChanged={() => {
                            refetchNotifications();
                            refetchUnread();
                        }}
                    />
                    <ActiveServers
                        servers={servers}
                        selectedServerId={selectedServer?.serverId}
                        onSelectServer={onSelectServer}
                        onNavigate={onNavigate}
                    />
                </div>
            </div>

            <TopPerformingTools tools={metrics?.topTools || []} />
            {toastNotification ? (
                <div className={`${DashboardStyles.alertToast} ${toastSeverityClass ? DashboardStyles[toastSeverityClass] : ''}`} role="alert">
                    <div className={DashboardStyles.alertMeta}>
                        <span className={DashboardStyles.alertBadge}>{String(toastNotification.severity || 'alert')}</span>
                        <strong>{toastNotification.title || 'Alert'}</strong>
                    </div>
                    <p className={DashboardStyles.alertMessage}>{toastNotification.message}</p>
                    <div className={DashboardStyles.alertFooter}>
                        <small className={DashboardStyles.alertTime}>{formatTime(toastNotification.createdAt)}</small>
                        <button
                            type="button"
                            className={DashboardStyles.alertDismiss}
                            onClick={() => {
                                setDismissedHighAlerts((prev) => {
                                    const next = new Set(prev);
                                    next.add(toastNotification.id);
                                    return next;
                                });
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ) : null}
            {showNotifications ? (
                <NotificationPanel
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    notificationsData={notificationsReady ? notificationsData : []}
                    loading={notificationsLoadingView}
                    openCycle={notificationOpenCycle}
                    onNotificationsChanged={() => {
                        refetchNotifications();
                        refetchUnread();
                    }}
                />
            ) : null}
        </div>
    );
}

function getTimeParams(mode) {
    switch (mode) {
        case 'today':
            return { hours: 24, bucketMinutes: 0, bucketSeconds: 30 };
        case 'week':
            return { hours: 24 * 7, bucketMinutes: 30, bucketSeconds: 0 };
        case 'month':
            return { hours: 24 * 30, bucketMinutes: 120, bucketSeconds: 0 };
        default:
            return { hours: 24, bucketMinutes: 0, bucketSeconds: 30 };
    }
}

function averageLatency(tools) {
    const filtered = (tools || []).filter((tool) => !isInternalToolName(tool?.toolName));
    if (filtered.length === 0) {
        return 0;
    }
    const total = filtered.reduce((sum, tool) => sum + (Number(tool.avgLatency) || 0), 0);
    return total / filtered.length;
}

function isInternalToolName(name) {
    const lower = String(name || '').toLowerCase();
    return !lower
        || lower.startsWith('__')
        || lower.includes('ping')
        || lower.includes('refresh')
        || lower.includes('token');
}

function isHighSeverity(severity) {
    const level = String(severity || '').toLowerCase();
    return level === 'error' || level === 'critical' || level === 'high';
}

function getAlertClass(severity) {
    const level = String(severity || '').toLowerCase();
    if (level === 'success') return 'alertSuccess';
    if (level === 'warning') return 'alertWarning';
    if (level === 'error' || level === 'critical' || level === 'high') return 'alertError';
    return 'alertInfo';
}

function isRecentAlert(raw, minutes) {
    if (!raw) {
        return false;
    }
    const ts = new Date(String(raw).replace(' ', 'T'));
    if (Number.isNaN(ts.getTime())) {
        return false;
    }
    const diffMs = Date.now() - ts.getTime();
    return diffMs >= 0 && diffMs <= minutes * 60_000;
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
