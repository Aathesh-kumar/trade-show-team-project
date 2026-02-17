import RequestLogsStyles from '../../styles/RequestLogs.module.css';

export default function RequestLogRow({ log, isSelected, onSelect }) {
    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 400 && status < 500) return 'warning';
        if (status >= 500) return 'error';
        return 'default';
    };

    const statusColor = getStatusColor(log.status);

    return (
        <tr 
            className={`${RequestLogsStyles.logRow} ${isSelected ? RequestLogsStyles.selected : ''}`}
            onClick={() => onSelect(log)}
        >
            <td className={RequestLogsStyles.timestamp}>
                {log.timestamp}
            </td>
            <td>
                <div className={RequestLogsStyles.toolCell}>
                    <span className={RequestLogsStyles.methodBadge}>
                        {log.method}
                    </span>
                    <span className={RequestLogsStyles.toolName}>
                        {log.tool}
                    </span>
                </div>
            </td>
            <td>
                <div className={`${RequestLogsStyles.statusBadge} ${RequestLogsStyles[statusColor]}`}>
                    <span className={RequestLogsStyles.statusCode}>{log.status}</span>
                    <span className={RequestLogsStyles.statusText}>{log.statusText}</span>
                </div>
            </td>
            <td className={RequestLogsStyles.latency}>
                {log.latency}
            </td>
            <td className={RequestLogsStyles.size}>
                {log.size}
            </td>
        </tr>
    );
}