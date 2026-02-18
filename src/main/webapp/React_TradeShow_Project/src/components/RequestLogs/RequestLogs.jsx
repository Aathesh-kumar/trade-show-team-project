import { useEffect, useMemo, useState } from 'react';
import { useGet } from '../Hooks/useGet';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import RequestLogsFooter from './RequestLogsFooter';
import PaginationControls from '../Common/PaginationControls';
import { getUiRequestLogs } from '../../utils/requestLogEvents';

const PAGE_SIZE = 12;
const BATCH_PADDING = 36;

export default function RequestLogs({ selectedServer }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tool: 'all',
        timeRange: 'last-24-hours'
    });

    const hours = useMemo(() => {
        switch (filters.timeRange) {
            case 'last-15-minutes':
                return 0.25;
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
    const batchLimit = page * PAGE_SIZE + BATCH_PADDING;
    const { data, loading, error, refetch } = useGet('/request-log', {
        immediate: !!serverId,
        params: {
            serverId,
            search: filters.search,
            status: filters.status === 'all' ? '' : filters.status,
            tool: filters.tool === 'all' ? '' : filters.tool,
            hours,
            limit: batchLimit
        },
        dependencies: [serverId, filters.search, filters.status, filters.tool, filters.timeRange, batchLimit]
    });

    const logs = useMemo(() => {
        const rows = data?.logs || [];
        const serverRows = rows.map(mapLog);
        const uiRows = getUiRequestLogs(serverId).map(mapLog);
        const merged = [...uiRows, ...serverRows];
        const dedup = new Map();
        merged.forEach((row) => {
            dedup.set(String(row.id), row);
        });
        return Array.from(dedup.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [data, serverId]);

    const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedLogs = logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const toolOptions = useMemo(() => {
        const set = new Set(logs.map((log) => log.tool).filter(Boolean));
        return Array.from(set);
    }, [logs]);

    useEffect(() => {
        if (!serverId) {
            return;
        }
        const intervalId = setInterval(() => refetch(), 15_000);
        return () => clearInterval(intervalId);
    }, [serverId, refetch]);

    useEffect(() => {
        const onRefresh = (event) => {
            const eventServerId = event?.detail?.serverId;
            if (!eventServerId || Number(eventServerId) === Number(serverId)) {
                refetch();
            }
        };
        window.addEventListener('pulse24x7-request-log-refresh', onRefresh);
        return () => window.removeEventListener('pulse24x7-request-log-refresh', onRefresh);
    }, [serverId, refetch]);

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
                onFilterChange={(next) => {
                    setFilters(next);
                    setPage(1);
                }}
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
                <div className={RequestLogsStyles.logsMainColumn}>
                    <RequestLogsTable
                        logs={pagedLogs}
                        selectedLog={selectedRequest}
                        onSelectLog={setSelectedRequest}
                        loading={loading}
                    />
                    <PaginationControls
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={logs.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                        className={RequestLogsStyles.paginationBar}
                    />
                </div>

                {selectedRequest && (
                    <RequestDetailsPanel
                        request={selectedRequest}
                        selectedServer={selectedServer}
                        onReplaySuccess={() => refetch()}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </div>

            <RequestLogsFooter totalLogs={logs.length} />
        </div>
    );
}

function parseJson(raw) {
    if (!raw) {
        return {};
    }
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return { raw };
    }
}

function mapLog(row) {
    return {
        id: row.id,
        serverId: row.serverId || row.server_id,
        toolId: row.toolId || row.tool_id,
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
    };
}
