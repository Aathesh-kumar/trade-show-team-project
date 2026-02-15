import { useState, useEffect } from 'react';
import { useGet } from '../customUtilHooks/useGet';
import { ENDPOINTS } from '../config/api';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import RequestLogsFooter from './RequestLogsFooter';
import LoadingSkeleton from '../LoadingComponents/LoadingSkeleton';

export default function RequestLogs() {
    const [selectedServerId, setSelectedServerId] = useState(null);
    const [selectedToolId, setSelectedToolId] = useState(null);
    const [selectedStatusCode, setSelectedStatusCode] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [timeRange, setTimeRange] = useState(24);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch all servers for filter dropdown
    const { data: serversData } = useGet(ENDPOINTS.SERVERS_ALL);
    const servers = serversData?.data || [];

    // Select first server by default
    useEffect(() => {
        if (!selectedServerId && servers.length > 0) {
            setSelectedServerId(servers[0].serverId);
        }
    }, [servers, selectedServerId]);

    // Fetch request logs with filters
    const { data: logsData, loading, error, refetch } = useGet(
        selectedServerId ? ENDPOINTS.LOGS_ALL(
            selectedServerId,
            selectedToolId,
            selectedStatusCode,
            timeRange,
            100
        ) : null,
        {
            refetchInterval: autoRefresh ? 5000 : null // Auto-refresh every 5 seconds
        }
    );

    // Fetch log statistics
    const { data: statsData } = useGet(
        selectedServerId ? ENDPOINTS.LOGS_STATS(selectedServerId, timeRange) : null
    );

    // Fetch unique tools for filter dropdown
    const { data: toolsData } = useGet(
        selectedServerId ? ENDPOINTS.LOGS_TOOLS(selectedServerId) : null
    );

    const logs = logsData?.data?.logs || [];
    const stats = statsData?.data || {};
    const toolNames = toolsData?.data?.tools || [];

    // Filter logs by search query (client-side)
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            log.endpoint?.toLowerCase().includes(query) ||
            log.toolName?.toLowerCase().includes(query) ||
            log.method?.toLowerCase().includes(query) ||
            log.statusCode?.toString().includes(query)
        );
    });

    const handleLogClick = (log) => {
        setSelectedLog(log);
    };

    const handleCloseDetails = () => {
        setSelectedLog(null);
    };

    const handleExport = () => {
        // Export logs as JSON
        const dataStr = JSON.stringify(filteredLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `request-logs-${new Date().toISOString()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!selectedServerId && servers.length === 0) {
        return (
            <div className={RequestLogsStyles.container}>
                <div className={RequestLogsStyles.emptyState}>
                    <p>📊 No servers configured yet</p>
                    <p>Add a server to start viewing request logs</p>
                </div>
            </div>
        );
    }

    return (
        <div className={RequestLogsStyles.container}>
            <RequestLogsHeader
                servers={servers}
                selectedServerId={selectedServerId}
                onServerChange={setSelectedServerId}
                toolNames={toolNames}
                selectedToolId={selectedToolId}
                onToolChange={setSelectedToolId}
                selectedStatusCode={selectedStatusCode}
                onStatusChange={setSelectedStatusCode}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                successCount={stats.successCount || 0}
                errorCount={stats.errorCount || 0}
                totalCount={stats.totalRequests || 0}
                onExport={handleExport}
            />

            <div className={RequestLogsStyles.content}>
                <div className={RequestLogsStyles.tableWrapper}>
                    {loading ? (
                        <LoadingSkeleton type="table" lines={10} />
                    ) : error ? (
                        <div className={RequestLogsStyles.error}>
                            <p>⚠️ Error loading logs: {error}</p>
                            <button onClick={refetch}>Retry</button>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className={RequestLogsStyles.empty}>
                            <p>📋 No request logs found</p>
                            <small>Logs will appear here as requests are made to your MCP tools</small>
                        </div>
                    ) : (
                        <RequestLogsTable
                            logs={filteredLogs}
                            onLogClick={handleLogClick}
                            selectedLog={selectedLog}
                        />
                    )}
                </div>

                {selectedLog && (
                    <RequestDetailsPanel
                        log={selectedLog}
                        onClose={handleCloseDetails}
                    />
                )}
            </div>

            <RequestLogsFooter
                logCount={filteredLogs.length}
                totalCount={logs.length}
                autoRefresh={autoRefresh}
                onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
                avgLatency={stats.avgLatency ? Math.round(stats.avgLatency) : 0}
            />
        </div>
    );
}