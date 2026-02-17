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
import { buildUrl } from '../../services/api';

export default function Dashboard({ selectedServer, onNavigate }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const serverId = selectedServer?.serverId;
    const { data: serversData } = useGet('/server/all', { immediate: true, dependencies: [serverId] });
    const { data: metrics } = useGet('/metrics/overview', {
        immediate: !!serverId,
        params: { serverId },
        dependencies: [serverId]
    });
    const { data: unread } = useGet('/notification/unread-count', {
        immediate: true,
        dependencies: [showNotifications]
    });

    useEffect(() => {
        if (!serverId) {
            return;
        }
        const runMonitor = () => {
            fetch(buildUrl('/server/monitor'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverId })
            }).catch(() => null);
        };
        runMonitor();
        const id = setInterval(runMonitor, 60_000);
        return () => clearInterval(id);
    }, [serverId]);
    const servers = Array.isArray(serversData) ? serversData : [];

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
                <SystemHealth data={metrics?.throughput24h || []} />
                <div className={DashboardStyles.sidePanel}>
                    <QuickActions onNavigate={onNavigate} />
                    <ActiveServers servers={servers} />
                </div>
            </div>

            <TopPerformingTools tools={metrics?.topTools || []} />
            <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>
    );
}

function averageLatency(tools) {
    if (!tools || tools.length === 0) {
        return 0;
    }
    const total = tools.reduce((sum, tool) => sum + (Number(tool.avgLatency) || 0), 0);
    return total / tools.length;
}
