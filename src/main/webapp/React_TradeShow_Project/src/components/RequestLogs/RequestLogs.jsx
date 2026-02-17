import { useMemo, useState } from 'react';
import { useGet } from '../Hooks/useGet';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import RequestLogsFooter from './RequestLogsFooter';

export default function RequestLogs({ selectedServer }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tool: 'all',
        timeRange: 'last-24-hours'
    });

    const hours = useMemo(() => {
        switch (filters.timeRange) {
            case 'last-15-minutes':
                return 1;
            case 'last-hour':
                return 1;
            case 'last-7-days':
                return 24 * 7;
            case 'last-24-hours':
            default:
                return 24;
        }
    }, [filters.timeRange]);

    const serverId = selectedServer?.serverId;
    const { data, loading, error } = useGet('/request-log', {
        immediate: !!serverId,
        params: {
            serverId,
            search: filters.search,
            status: filters.status === 'all' ? '' : filters.status,
            tool: filters.tool === 'all' ? '' : filters.tool,
            hours,
            limit: 100
        },
        dependencies: [serverId, filters.search, filters.status, filters.tool, filters.timeRange]
    });

    const logs = useMemo(() => {
        const rows = data?.logs || [];
        return rows.map((row) => ({
            id: row.id,
            timestamp: row.createdAt || row.created_at,
            tool: row.toolName,
            endpoint: row.toolName,
            method: row.method || 'POST',
            status: row.statusCode,
            statusText: row.statusText || (row.statusCode >= 200 && row.statusCode < 300 ? 'OK' : 'ERR'),
            latency: `${row.latencyMs}ms`,
            size: `${Math.max(0, Math.round((row.responseSizeBytes || 0) / 1024 * 10) / 10)}kb`,
            requestPayload: parseJson(row.requestPayload),
            responseBody: parseJson(row.responseBody),
            userAgent: row.userAgent
        }));
    }, [data]);

    const toolOptions = useMemo(() => {
        const set = new Set(logs.map((log) => log.tool).filter(Boolean));
        return Array.from(set);
    }, [logs]);

    if (!serverId) {
        return (
            <div className={RequestLogsStyles.requestLogs}>
                <div className={RequestLogsStyles.emptyState}>
                    <p>Select a server to view request logs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={RequestLogsStyles.requestLogs}>
            <RequestLogsHeader
                filters={filters}
                onFilterChange={setFilters}
                stats={{
                    totalSuccess: data?.stats?.totalSuccess || 0,
                    totalErrors: data?.stats?.totalErrors || 0
                }}
                toolOptions={toolOptions}
            />

            {error && (
                <div className={RequestLogsStyles.submitError}>
                    Failed to load logs: {error}
                </div>
            )}

            <div className={RequestLogsStyles.logsContent}>
                <RequestLogsTable
                    logs={logs}
                    selectedLog={selectedRequest}
                    onSelectLog={setSelectedRequest}
                    loading={loading}
                />

                {selectedRequest && (
                    <RequestDetailsPanel
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </div>

            <RequestLogsFooter />
        </div>
    );
}

function parseJson(raw) {
    if (!raw) {
        return {};
    }
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        return { raw };
    }
}
