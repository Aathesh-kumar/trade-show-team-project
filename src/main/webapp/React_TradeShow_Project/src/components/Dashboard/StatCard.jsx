import DashboardStyles from '../../styles/Dashboard.module.css';

export default function StatCard({ icon, label, value, trend, trendPositive, iconBg, loading }) {
    return (
        <div className={`${DashboardStyles.statCard} ${loading ? DashboardStyles.loading : ''}`}>
            <div className={DashboardStyles.statIcon} style={{ backgroundColor: iconBg }}>
                {icon}
            </div>
            <div className={DashboardStyles.statContent}>
                <p className={DashboardStyles.statLabel}>{label}</p>
                <h2 className={DashboardStyles.statValue}>
                    {loading ? (
                        <span className={DashboardStyles.skeleton}></span>
                    ) : (
                        value
                    )}
                </h2>
            </div>
            <div 
                className={`${DashboardStyles.statTrend} ${
                    trendPositive ? DashboardStyles.positive : DashboardStyles.negative
                }`}
            >
                {loading ? (
                    <span className={DashboardStyles.skeletonSmall}></span>
                ) : (
                    trend
                )}
            </div>
        </div>
    );
}