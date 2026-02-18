import { useEffect, useState } from 'react';
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

export default function Dashboard({ selectedServer, onNavigate, onSelectServer }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [timeMode, setTimeMode] = useState('today');
    const [notificationNonce, setNotificationNonce] = useState(0);
    const serverId = selectedServer?.serverId;
    const { data: serversData } = useGet('/server/all', { immediate: true, dependencies: [serverId] });
    const { data: serverStatusesData } = useGet('/server/statuses', { immediate: true, dependencies: [serverId] });
    const timeParams = getTimeParams(timeMode);
    const { data: metrics } = useGet('/metrics/overview', {
        immediate: !!serverId,
        params: {
            serverId,
            hours: timeParams.hours,
            bucketMinutes: timeParams.bucketMinutes
        },
        dependencies: [serverId, timeMode]
    });
    const { data: unread } = useGet('/notification/unread-count', {
        immediate: true,
        dependencies: [showNotifications, serverId, notificationNonce]
    });

    useEffect(() => {
        if (!serverId) {
            return;
        }
        const runMonitor = () => {
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
        const id = setInterval(runMonitor, 60_000);
        return () => clearInterval(id);
    }, [serverId]);

    useEffect(() => {
        const onNotificationRefresh = () => {
            setNotificationNonce((prev) => prev + 1);
        };
        const intervalId = setInterval(() => setNotificationNonce((prev) => prev + 1), 10_000);
        window.addEventListener('pulse24x7-notification-refresh', onNotificationRefresh);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('pulse24x7-notification-refresh', onNotificationRefresh);
        };
    }, []);
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
        <div className={DashboardStyles.dashboard}>
            <header className={DashboardStyles.header}>
                <h1>Dashboard Overview</h1>
                <div className={DashboardStyles.headerRight}>
                    <div className={DashboardStyles.systemStatus}>
                        <span className={DashboardStyles.statusDot}></span>
                        <span>System Online</span>
                    </div>
                    <button className={DashboardStyles.notificationBtn} onClick={() => setShowNotifications(true)}>
                        <IoNotifications />
                        {(unread?.unreadCount || 0) > 0 && (
                            <span className={DashboardStyles.notificationCount}>{unread.unreadCount}</span>
                        )}
                    </button>
                </div>
            </header>

            <div className={DashboardStyles.statsGrid}>
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
            </div>

            <div className={DashboardStyles.mainGrid}>
                <SystemHealth
                    data={metrics?.throughput24h || []}
                    timeMode={timeMode}
                    onChangeTimeMode={setTimeMode}
                />
                <div className={DashboardStyles.sidePanel}>
                    <QuickActions onNavigate={onNavigate} selectedServer={selectedServer} />
                    <ActiveServers
                        servers={servers}
                        selectedServerId={selectedServer?.serverId}
                        onSelectServer={onSelectServer}
                        onNavigate={onNavigate}
                    />
                </div>
            </div>

            <TopPerformingTools tools={metrics?.topTools || []} />
            <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>
    );
}

function getTimeParams(mode) {
    switch (mode) {
        case 'today':
            return { hours: 24, bucketMinutes: 0 };
        case 'week':
            return { hours: 24 * 7, bucketMinutes: 30 };
        case 'month':
            return { hours: 24 * 30, bucketMinutes: 120 };
        default:
            return { hours: 24, bucketMinutes: 0 };
    }
}

function averageLatency(tools) {
    if (!tools || tools.length === 0) {
        return 0;
    }
    const total = tools.reduce((sum, tool) => sum + (Number(tool.avgLatency) || 0), 0);
    return total / tools.length;
}
