import RequestLogsStyles from '../../styles/RequestLogs.module.css';

export default function RequestLogsFooter({ totalLogs = 0 }) {
    return (
        <footer className={RequestLogsStyles.logsFooter}>
            <div className={RequestLogsStyles.footerLeft}>
                <div className={RequestLogsStyles.liveIndicator}>
                    <span className={RequestLogsStyles.liveDot}></span>
                    <span>Auto Refresh: Active</span>
                </div>
                <span className={RequestLogsStyles.footerDivider}>|</span>
                <span className={RequestLogsStyles.footerText}>
                    Showing {totalLogs} logs
                </span>
            </div>

            <div className={RequestLogsStyles.footerRight}>
                <span className={RequestLogsStyles.footerLabel}>Refresh:</span>
                <span className={RequestLogsStyles.footerValue}>15s + event driven</span>
            </div>
        </footer>
    );
}
