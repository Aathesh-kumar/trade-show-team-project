import { useEffect, useMemo, useState } from 'react';
import { useGet } from '../Hooks/useGet';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import RequestLogsFooter from './RequestLogsFooter';
import PaginationControls from '../Common/PaginationControls';
import { getUiRequestLogs } from '../../utils/requestLogEvents';
import useDebouncedValue from '../Hooks/useDebouncedValue';
import useBufferedLoading from '../Hooks/useBufferedLoading';

export default function RequestLogs({ selectedServer }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tool: 'all',
        timeRange: 'last-24-hours'
    });
    const [page, setPage] = useState(1);
    const pageSize = 40;
    const debouncedSearch = useDebouncedValue(filters.search, 450);

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
    const { data, loading, error, refetch } = useGet('/request-log', {
        immediate: !!serverId,
        params: {
            serverId,
            search: debouncedSearch,
            status: filters.status === 'all' ? '' : filters.status,
            tool: filters.tool === 'all' ? '' : filters.tool,
            hours,
            page,
            limit: pageSize
        },
        dependencies: [serverId, debouncedSearch, filters.status, filters.tool, filters.timeRange, page]
    });
    const bufferedLoading = useBufferedLoading(loading, 2200);

    const logs = useMemo(() => {
        const rows = data?.logs || [];
        const uiRows = getUiRequestLogs(serverId) || [];
        const merged = page === 1 ? [...uiRows, ...rows] : rows;
        return merged.map((row) => ({
            id: row.id,
            serverId: row.serverId || row.server_id,
            toolId: row.toolId || row.tool_id,
            timestamp: String(row.createdAt || row.created_at || '-'),
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
    }, [data, serverId, page]);

    useEffect(() => {
        setPage(1);
    }, [serverId, filters.search, filters.status, filters.tool, filters.timeRange]);

    useEffect(() => {
        if (!serverId) {
            return undefined;
        }
        const onRefresh = (event) => {
            const eventServerId = event?.detail?.serverId;
            if (!eventServerId || Number(eventServerId) === Number(serverId)) {
                setPage(1);
                refetch();
            }
        };
        window.addEventListener('pulse24x7-request-log-refresh', onRefresh);
        return () => window.removeEventListener('pulse24x7-request-log-refresh', onRefresh);
    }, [serverId, refetch]);

    const totalItems = (data?.pagination?.totalItems || 0) + (page === 1 ? (getUiRequestLogs(serverId)?.length || 0) : 0);
    const totalPages = Math.max(1, data?.pagination?.totalPages || 1);

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
                    loading={bufferedLoading}
                />

                {selectedRequest && (
                    <RequestDetailsPanel
                        request={selectedRequest}
                        selectedServer={selectedServer}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </div>

            <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setPage}
            />

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
