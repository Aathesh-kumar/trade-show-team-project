import DashboardStyles from '../../styles/Dashboard.module.css';

export default function StatCard({ icon, label, value, trend, trendPositive, iconBg }) {
    return (
        <div className={DashboardStyles.statCard}>
            <div className={DashboardStyles.statIcon} style={{ backgroundColor: iconBg }}>
                {icon}
            </div>
            <div className={DashboardStyles.statContent}>
                <p className={DashboardStyles.statLabel}>{label}</p>
                <h2 className={DashboardStyles.statValue}>{value}</h2>
            </div>
            <div className={`${DashboardStyles.statTrend} ${trendPositive ? DashboardStyles.positive : DashboardStyles.negative}`}>
                {trend}
            </div>
        </div>
    );
}