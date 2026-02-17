import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogRow from './RequestLogRow';
import LoadingSpinner from '../Loading/LoadingSpinner';

export default function RequestLogsTable({ logs, selectedLog, onSelectLog, loading }) {
    return (
        <div className={RequestLogsStyles.tableContainer}>
            <table className={RequestLogsStyles.logsTable}>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Tool / Endpoint</th>
                        <th>Status</th>
                        <th>Latency</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && logs.length > 0 && (
                        <tr>
                            <td colSpan="5" className={RequestLogsStyles.loadingRow}>
                                <LoadingSpinner size="small" text="Refreshing logs..." />
                            </td>
                        </tr>
                    )}
                    
                    {logs.map((log) => (
                        <RequestLogRow
                            key={log.id}
                            log={log}
                            isSelected={selectedLog?.id === log.id}
                            onSelect={onSelectLog}
                        />
                    ))}
                </tbody>
            </table>

            {logs.length === 0 && (
                <div className={RequestLogsStyles.emptyState}>
                    <p>No request logs found</p>
                    <span>Requests will appear here in real-time</span>
                </div>
            )}
        </div>
    );
}