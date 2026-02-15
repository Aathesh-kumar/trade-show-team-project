import { useState, useEffect } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import StatCard from './StatCard';
import SystemHealth from './SystemHealth';
import QuickActions from './QuickActions';
import ActiveServers from './ActiveServers';
import TopPerformingTools from './TopPerformingTools';
import { MdInfo, MdSync, MdError, MdSpeed } from 'react-icons/md';
import { IoNotifications } from 'react-icons/io5';
import { useGet } from '../customUtilHooks/useGet';
import { buildUrl, ENDPOINTS } from '../../services/api';

export default function Dashboard() {
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Fetch dashboard stats
    const { 
        data: statsData, 
        loading: statsLoading, 
        error: statsError,
        refetch: refetchStats
    } = useGet(buildUrl(ENDPOINTS.STATS), {
        immediate: true,
        dependencies: [refreshKey],
        onError: (error) => {
            console.error('Failed to fetch stats:', error);
        }
    });

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Manual refresh handler
    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        refetchStats();
    };

    // Map stats data to cards
    const getStatsCards = () => {
        if (!statsData) {
            return [
                { icon: <MdInfo />, label: "Uptime", value: "—", trend: "—", trendPositive: true, iconBg: "#3B82F6" },
                { icon: <MdSync />, label: "Total Requests", value: "—", trend: "—", trendPositive: true, iconBg: "#06B6D4" },
                { icon: <MdError />, label: "Error Rate", value: "—", trend: "—", trendPositive: true, iconBg: "#EF4444" },
                { icon: <MdSpeed />, label: "Avg Latency", value: "—", trend: "—", trendPositive: false, iconBg: "#F59E0B" }
            ];
        }

        return [
            { 
                icon: <MdInfo />, 
                label: "Uptime", 
                value: statsData.uptime || "—", 
                trend: statsData.uptimePercentage || "—", 
                trendPositive: true, 
                iconBg: "#3B82F6" 
            },
            { 
                icon: <MdSync />, 
                label: "Total Requests", 
                value: statsData.totalRequests?.toLocaleString() || "—", 
                trend: statsData.requestsTrend || "—", 
                trendPositive: statsData.requestsTrendPositive !== false, 
                iconBg: "#06B6D4" 
            },
            { 
                icon: <MdError />, 
                label: "Error Rate", 
                value: statsData.errorRate || "—", 
                trend: statsData.errorRateTrend || "—", 
                trendPositive: statsData.errorRateTrendPositive !== false, 
                iconBg: "#EF4444" 
            },
            { 
                icon: <MdSpeed />, 
                label: "Avg Latency", 
                value: statsData.avgLatency || "—", 
                trend: statsData.latencyTrend || "—", 
                trendPositive: statsData.latencyTrendPositive !== false, 
                iconBg: "#F59E0B" 
            }
        ];
    };

    const statsCards = getStatsCards();

    return (
        <div className={DashboardStyles.dashboard}>
            <header className={DashboardStyles.header}>
                <h1>Dashboard Overview</h1>
                <div className={DashboardStyles.headerRight}>
                    <div className={DashboardStyles.systemStatus}>
                        <span className={DashboardStyles.statusDot}></span>
                        <span>{statsData?.systemStatus || 'System Online'}</span>
                    </div>
                    <button 
                        className={DashboardStyles.refreshBtn}
                        onClick={handleRefresh}
                        disabled={statsLoading}
                        title="Refresh Data"
                    >
                        <MdSync className={statsLoading ? DashboardStyles.spinning : ''} />
                    </button>
                    <button className={DashboardStyles.notificationBtn}>
                        <IoNotifications />
                        {statsData?.unreadNotifications > 0 && (
                            <span className={DashboardStyles.notificationBadge}>
                                {statsData.unreadNotifications}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {statsError && (
                <div className={DashboardStyles.errorBanner}>
                    <MdError /> Failed to load dashboard data: {statsError}
                </div>
            )}

            <div className={DashboardStyles.statsGrid}>
                {statsCards.map((stat, index) => (
                    <StatCard 
                        key={index}
                        icon={stat.icon}
                        label={stat.label}
                        value={stat.value}
                        trend={stat.trend}
                        trendPositive={stat.trendPositive}
                        iconBg={stat.iconBg}
                        loading={statsLoading}
                    />
                ))}
            </div>

            <div className={DashboardStyles.mainGrid}>
                <SystemHealth refreshKey={refreshKey} />
                <div className={DashboardStyles.sidePanel}>
                    <QuickActions onRefresh={handleRefresh} />
                    <ActiveServers refreshKey={refreshKey} />
                </div>
            </div>

            <TopPerformingTools refreshKey={refreshKey} />
        </div>
    );
}