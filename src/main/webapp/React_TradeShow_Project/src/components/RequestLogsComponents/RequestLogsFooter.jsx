import RequestLogsStyles from '../../styles/RequestLogs.module.css';

export default function RequestLogsFooter() {
    return (
        <footer className={RequestLogsStyles.logsFooter}>
            <div className={RequestLogsStyles.footerLeft}>
                <div className={RequestLogsStyles.liveIndicator}>
                    <span className={RequestLogsStyles.liveDot}></span>
                    <span>Live Tail: Active</span>
                </div>
                <span className={RequestLogsStyles.footerDivider}>|</span>
                <span className={RequestLogsStyles.footerText}>
                    Showing 5 of 12,452 logs
                </span>
            </div>

            <div className={RequestLogsStyles.footerRight}>
                <span className={RequestLogsStyles.footerLabel}>Memory:</span>
                <span className={RequestLogsStyles.footerValue}>452MB / 1024MB</span>
                <span className={RequestLogsStyles.footerDivider}>|</span>
                <span className={RequestLogsStyles.footerLabel}>CPU:</span>
                <span className={RequestLogsStyles.footerValue}>12.4%</span>
            </div>
        </footer>
    );
}