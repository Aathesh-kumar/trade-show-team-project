import DashboardStyles from '../../styles/Dashboard.module.css';
import StatCard from './StatCard';
import SystemHealth from './SystemHealth';
import QuickActions from './QuickActions';
import ActiveServers from './ActiveServers';
import TopPerformingTools from './TopPerformingTools';
import { MdInfo, MdSync, MdError, MdSpeed } from 'react-icons/md';
import { IoNotifications } from 'react-icons/io5';

export default function Dashboard() {
    return (
        <div className={DashboardStyles.dashboard}>
            <header className={DashboardStyles.header}>
                <h1>Dashboard Overview</h1>
                <div className={DashboardStyles.headerRight}>
                    <div className={DashboardStyles.systemStatus}>
                        <span className={DashboardStyles.statusDot}></span>
                        <span>System Online</span>
                    </div>
                    <button className={DashboardStyles.notificationBtn}>
                        <IoNotifications />
                    </button>
                </div>
            </header>

            <div className={DashboardStyles.statsGrid}>
                <StatCard 
                    icon={<MdInfo />}
                    label="Uptime"
                    value="14d 2h 12m"
                    trend="+99.9%"
                    trendPositive={true}
                    iconBg="#3B82F6"
                />
                <StatCard 
                    icon={<MdSync />}
                    label="Total Requests"
                    value="124,582"
                    trend="+12.4%"
                    trendPositive={true}
                    iconBg="#06B6D4"
                />
                <StatCard 
                    icon={<MdError />}
                    label="Error Rate"
                    value="0.12%"
                    trend="-0.4%"
                    trendPositive={true}
                    iconBg="#EF4444"
                />
                <StatCard 
                    icon={<MdSpeed />}
                    label="Avg Latency"
                    value="142ms"
                    trend="+4ms"
                    trendPositive={false}
                    iconBg="#F59E0B"
                />
            </div>

            <div className={DashboardStyles.mainGrid}>
                <SystemHealth />
                <div className={DashboardStyles.sidePanel}>
                    <QuickActions />
                    <ActiveServers />
                </div>
            </div>

            <TopPerformingTools />
        </div>
    );
}